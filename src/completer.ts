import * as vscode from 'vscode';
import {
  Position,
  TextDocument,
  CancellationToken,
  CompletionContext,
  CompletionItem,
  CompletionItemKind,
} from 'vscode';
import { Extension } from './extension';
import { EOL } from 'os';
import { countOccurrences } from './utils';
import { InputMethod } from './inputMethods/inputMethod';
import { Pinyin } from './inputMethods/pinyin';

interface Account {
  open: string;
  close: string;
  currencies: string;
  balance: string[];
}

interface CompletionData {
  accounts: { [name: string]: Account };
  commodities: string[];
  payees: string[];
  narrations: string[];
  transactions: { [key: string]: string };
  metadatas: { [key: string]: string };
  tags: string[];
  links: string[];
}

export class Completer
  implements vscode.CompletionItemProvider, vscode.HoverProvider {
  extension: Extension;
  accounts: { [name: string]: Account };
  payees: string[];
  narrations: string[];
  commodities: string[];
  transactions: { [key: string]: string };
  metadatas: { [key: string]: string };
  tags: string[];
  links: string[];
  wordPattern: RegExp;
  inputMethods: InputMethod[];

  constructor(extension: Extension) {
    this.extension = extension;
    this.accounts = {};
    this.payees = [];
    this.narrations = [];
    this.commodities = [];
    this.transactions = {};
    this.metadatas = {};
    this.tags = [];
    this.links = [];
    this.wordPattern = new RegExp('[A-Za-z:]+\\S+|"([^\\\\"]|\\\\")*"');
    const inputMethodList = vscode.workspace.getConfiguration('beancount')[
      'inputMethods'
    ] as string[];
    this.inputMethods = [];
    if (inputMethodList.includes('pinyin')) {
      this.inputMethods.push(
        new Pinyin(
          extension.context.asAbsolutePath('/data/pinyin_initial.json')
        )
      );
    }
  }

  updateData(output: string) {
    const data: CompletionData = JSON.parse(output);
    this.accounts = data.accounts;
    this.commodities = data.commodities;
    this.payees = data.payees;
    this.narrations = data.narrations;
    this.transactions = data.transactions;
    this.metadatas = data.metadatas;
    this.tags = data.tags;
    this.links = data.links;
  }

  describeAccount(name: string): string {
    if (name in this.accounts) {
      const lines = [
        name,
        'balance: ' +
          (this.accounts[name].balance.length > 0
            ? this.accounts[name].balance
            : '0'),
        'opened on ' + this.accounts[name].open,
      ];
      if (this.accounts[name].close.length > 0) {
        lines.push('closed on ' + this.accounts[name].close);
      }
      if (this.accounts[name].currencies.length > 0) {
        lines.push('currencies: ' + this.accounts[name].currencies);
      }
      return lines.join(EOL);
    } else {
      return '';
    }
  }

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): Thenable<vscode.Hover> {
    return new Promise((resolve, _reject) => {
      const wordRange = document.getWordRangeAtPosition(
        position,
        this.wordPattern
      );
      const name = document.getText(wordRange);
      if (name in this.accounts) {
        let description;
        const balanceArray = this.accounts[name].balance.map(
          (balance, index, balances) => {
            return '* ' + balance;
          }
        );
        if (balanceArray.length === 0) {
          description = new vscode.MarkdownString(name + '\n\nbalance: 0');
        } else if (balanceArray.length === 1) {
          description = new vscode.MarkdownString(
            name + '\n\nbalance: ' + this.accounts[name].balance
          );
        } else {
          const balanceMd = balanceArray.join('\n');
          description = new vscode.MarkdownString(
            name + '\n\nbalance:\n' + balanceMd
          );
        }
        resolve(new vscode.Hover(description, wordRange));
      } else {
        resolve([]);
      }
    });
  }

  provideCompletionItems(
    document: TextDocument,
    position: Position,
    token: CancellationToken,
    context: CompletionContext
  ): Promise<CompletionItem[] | vscode.CompletionList> {
    const textBefore = document
      .lineAt(position.line)
      .text.substring(0, position.character);
    const reg = /[0-9]{4,}[\-/][0-9]+[\-/][0-9]+\s*([\*!]|txn)/g;
    const triggerCharacter = context.triggerCharacter;
    return new Promise((resolve, _reject) => {
      const dateReg = /([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))\s+/
      const optionIndentSize = vscode.workspace.getConfiguration('beancount')['indentationSize'];
      const currentLineIndentSize = textBefore.search(/\S|$/)
      // this.extension.logger.appendLine(`${currentLineIndentSize}`)
      const insertItemWithSuffixLetters = (
        list: CompletionItem[],
        key: string,
        kind: CompletionItemKind,
        suffix: string,
        insertText?: string
      ) => {
        // let findOne = false;
        let newKey = key;
        for (const inputMethod of this.inputMethods) {
          const letters = inputMethod.getLetterRepresentation(key);
          if (letters.length > 0) {
            // findOne = true;
            newKey = letters + '(' + key + ')';
            break;
            // const item = new CompletionItem(
            //   letters + '(' + text + ')',
            //   kind
            // );
            // item.insertText = text + suffix;
            // list.push(item);
          }
        }
        // if (!findOne) {
        const item = new CompletionItem(newKey, kind);
        if (typeof(insertText) != 'undefined') {
          item.insertText = insertText + suffix
        } else {
          item.insertText = key + suffix;
        }
        list.push(item);
        // }
      };
      const insertItemWithSurroundLetters = (
        list: CompletionItem[],
        key: string,
        kind: CompletionItemKind,
        suffix: string,
        prefix: string,
        insertText?: string
      ) => {
        let newKey = key;
        for (const inputMethod of this.inputMethods) {
          const letters = inputMethod.getLetterRepresentation(key);
          if (letters.length > 0) {
            newKey = letters + '(' + key + ')';
            break;
          }
        }
        const wordRange = document.getWordRangeAtPosition(position, /'\w*/);
        const item = new CompletionItem(newKey, kind);
        item.range = wordRange;
        item.filterText = '\'' + newKey
        if (typeof(insertText) != 'undefined') {
          item.insertText = prefix + insertText + suffix;
        } else {
          item.insertText = prefix + key + suffix;
        }
        list.push(item);
      };
      if (countOccurrences(textBefore, /;/g) > 0) {
        if (triggerCharacter === '#') {
          const list: CompletionItem[] = [];
          list.push(new CompletionItem('region', CompletionItemKind.Text));
          list.push(new CompletionItem('endregion', CompletionItemKind.Text));
          resolve(list);
          return;
        } else {
          resolve([]);
          return;
        }
      }
      if (currentLineIndentSize === 0) {
        if (triggerCharacter === '#') {
          const list = this.tags.map((value, index, array) => {
            return new CompletionItem(value, CompletionItemKind.Variable);
          });
          resolve(list);
          return;
        } else if (triggerCharacter === '^') {
          const list = this.links.map((value, index, array) => {
            return new CompletionItem(value, CompletionItemKind.Reference);
          });
          resolve(list);
          return;
        } else if (
          triggerCharacter === '"' &&
          vscode.workspace.getConfiguration('beancount')['completePayeeNarration']
        ) {
          const r = reg.exec(textBefore);
          const numQuotes =
            countOccurrences(textBefore, /\"/g) -
            countOccurrences(textBefore, /\\"/g);
          if (r != null && numQuotes % 2 === 1) {
            const list: CompletionItem[] = [];
            if (numQuotes === 1) {
              this.payees.forEach((payee, i, a) => {
                insertItemWithSuffixLetters(
                  list,
                  payee,
                  CompletionItemKind.Variable,
                  '" '
                );
              });
            }
            if (numQuotes <= 3) {
              this.narrations.forEach((narration, i, a) => {
                insertItemWithSuffixLetters(
                  list,
                  narration,
                  CompletionItemKind.Text,
                  '" '
                );
              });
            }
            resolve(list);
            return;
          }
        } else if (triggerCharacter === '\'' &&
        vscode.workspace.getConfiguration('beancount')['completePayeeNarration']) {
          const numQuotes =
            countOccurrences(textBefore, /\"/g) -
            countOccurrences(textBefore, /\\"/g);
          const list: CompletionItem[] = [];
          if (numQuotes === 2) {
            this.narrations.forEach((narration, i, a) => {
              insertItemWithSurroundLetters(list, narration, CompletionItemKind.Text, '" ', '"');
            });
          } else {
            this.payees.forEach((payee, i, a) => {
              insertItemWithSurroundLetters(list, payee, CompletionItemKind.Variable, '" ', '"');
          });}
          resolve(list);
          return;
        } else {
          if (textBefore.match(/([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))\s+\b(open|close|balance|pad)\b/)) {
            const list: CompletionItem[] = [];
            const wordRange = document.getWordRangeAtPosition(
              position,
              this.wordPattern
            );
            for (const account of Object.keys(this.accounts)) {
              const item = new CompletionItem(
                account,
                CompletionItemKind.EnumMember
              );
              item.documentation = this.describeAccount(account);
              item.range = wordRange;
              list.push(item);
            }
            this.commodities.forEach((v, i, a) => {
              const item = new CompletionItem(v, CompletionItemKind.Unit);
              item.range = wordRange;
              list.push(item);
            });
            resolve(list);
            return;
          } else if (
            textBefore.match(dateReg) &&
            vscode.workspace.getConfiguration('beancount')['completeTransaction']
          ) {
            const list: CompletionItem[] = [];
            for (const key in this.transactions) {
              insertItemWithSuffixLetters(list, key, CompletionItemKind.Module, '', this.transactions[key]);
            }
            resolve(list);
          }
          resolve([]);
          return
        }
      } else {
        const previousLineIndentSize = document.lineAt(position.line - 1).text.search(/\S|$/)
        const optionCompleteMetadata = vscode.workspace.getConfiguration('beancount')['completeMetadata']
        let metadataCondition = false
        if (triggerCharacter === ':' && optionCompleteMetadata) {
          const list: CompletionItem[] = [];
          for (const key in this.metadatas) {
            insertItemWithSuffixLetters(list, key, CompletionItemKind.Field, '', this.metadatas[key]);
          }
          resolve(list);
          return
        }
        if (previousLineIndentSize != 0) {
          if ((currentLineIndentSize > previousLineIndentSize) ||
          (currentLineIndentSize > optionIndentSize)) {
            metadataCondition = true
          }
        }
        if (metadataCondition == true && optionCompleteMetadata) {
          const list: CompletionItem[] = [];
          for (const key in this.metadatas) {
            insertItemWithSuffixLetters(list, key, CompletionItemKind.Field, '', this.metadatas[key]);
          }
          resolve(list);
          return
        } else {
          const list: CompletionItem[] = [];
          const wordRange = document.getWordRangeAtPosition(
            position,
            this.wordPattern
          );
          for (const account of Object.keys(this.accounts)) {
            const item = new CompletionItem(
              account,
              CompletionItemKind.EnumMember
            );
            item.documentation = this.describeAccount(account);
            item.range = wordRange;
            list.push(item);
          }
          this.commodities.forEach((v, i, a) => {
            const item = new CompletionItem(v, CompletionItemKind.Unit);
            item.range = wordRange;
            list.push(item);
          });
          resolve(list);
          return;
        }
      }
      resolve([]);
    });
  }
}