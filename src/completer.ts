import * as vscode from 'vscode';
import {
  Range,
  Position,
  TextDocument,
  CancellationToken,
  CompletionContext,
  CompletionItem,
  CompletionItemKind,
} from 'vscode';
import {Extension} from './extension';
import {EOL} from 'os';
import {countOccurrences} from './utils';
import {InputMethod} from './inputMethods/inputMethod';
import {Pinyin} from './inputMethods/pinyin';

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
              extension.context.asAbsolutePath('/data/pinyin_initial.json'),
          ),
      );
    }
  }

  updateData(output: string) {
    const data: CompletionData = JSON.parse(output);
    this.accounts = data.accounts;
    this.commodities = data.commodities;
    this.payees = data.payees;
    this.narrations = data.narrations;
    this.tags = data.tags;
    this.links = data.links;
  }

  describeAccount(name: string): string {
    if (name in this.accounts) {
      const lines = [
        name,
        'balance: ' +
          (this.accounts[name].balance.length > 0 ?
            this.accounts[name].balance :
            '0'),
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
      _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.Hover> {
    return new Promise((resolve, _reject) => {
      const wordRange = document.getWordRangeAtPosition(
          position,
          this.wordPattern,
      );
      const name = document.getText(wordRange);
      if (name in this.accounts) {
        let description;
        const balanceArray = this.accounts[name].balance.map(
            (balance, index, balances) => {
              return '* ' + balance;
            },
        );
        if (balanceArray.length === 0) {
          description = new vscode.MarkdownString(name + '\n\nbalance: 0');
        } else if (balanceArray.length === 1) {
          description = new vscode.MarkdownString(
              name + '\n\nbalance: ' + this.accounts[name].balance,
          );
        } else {
          const balanceMd = balanceArray.join('\n');
          description = new vscode.MarkdownString(
              name + '\n\nbalance:\n' + balanceMd,
          );
        }
        resolve(new vscode.Hover(description, wordRange));
      } else {
        resolve(null);
      }
    });
  }

  provideCompletionItems(
      document: TextDocument,
      position: Position,
      token: CancellationToken,
      context: CompletionContext,
  ): Promise<CompletionItem[] | vscode.CompletionList> {
    const textBefore = document
        .lineAt(position.line)
        .text.substring(0, position.character);
    const reg = /[0-9]{4,}[\-/][0-9]+[\-/][0-9]+\s*([\*!]|txn)/g;
    const triggerCharacter = context.triggerCharacter;
    return new Promise((resolve, _reject) => {
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
      } else if (triggerCharacter === '2' && textBefore.trim() === '2') {
        const today = new Date();
        const year = today.getFullYear().toString();
        const month =
          (today.getMonth() + 1 < 10 ? '0' : '') +
          (today.getMonth() + 1).toString();
        const date =
          (today.getDate() < 10 ? '0' : '') + today.getDate().toString();
        const dateString = year + '-' + month + '-' + date;
        const itemToday = new CompletionItem(
            dateString,
            CompletionItemKind.Event,
        );
        itemToday.detail = 'today';
        itemToday.range = new Range(
            new Position(position.line, position.character - 1),
            position,
        );
        resolve([itemToday]);
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
          const insertItemWithLetters = (
              list: CompletionItem[],
              text: string,
              kind: CompletionItemKind,
              suffix: string,
          ) => {
            let findOne = false;
            for (const inputMethod of this.inputMethods) {
              const letters = inputMethod.getLetterRepresentation(text);
              if (letters.length > 0) {
                findOne = true;
                const item = new CompletionItem(
                    letters + '(' + text + ')',
                    kind,
                );
                item.insertText = text + suffix;
                list.push(item);
              }
            }
            if (!findOne) {
              const item = new CompletionItem(text, kind);
              item.insertText = text + suffix;
              list.push(item);
            }
          };
          const list: CompletionItem[] = [];
          if (numQuotes === 1) {
            this.payees.forEach((payee, i, a) => {
              insertItemWithLetters(
                  list,
                  payee,
                  CompletionItemKind.Variable,
                  '" ',
              );
            });
          }
          if (numQuotes <= 3) {
            this.narrations.forEach((narration, i, a) => {
              insertItemWithLetters(
                  list,
                  narration,
                  CompletionItemKind.Text,
                  '" ',
              );
            });
          }
          resolve(list);
          return;
        }
      } else {
        // close/pad/balance
        const reg2 = /[0-9]{4,}[\-/][0-9]+[\-/][0-9]+\s*(close|pad|balance)/g;
        let isClosePadBalancePosting = reg2.exec(textBefore) != null;
        if (
          !isClosePadBalancePosting &&
          document.lineAt(position.line).text[0] === ' '
        ) {
          let lineNumber = position.line - 1;
          while (
            lineNumber >= 0 &&
            document.lineAt(lineNumber).text.trim().length > 0
          ) {
            if (reg.exec(document.lineAt(lineNumber).text) != null) {
              isClosePadBalancePosting = true;
              break;
            }
            lineNumber -= 1;
          }
        }
        if (isClosePadBalancePosting) {
          const list: CompletionItem[] = [];
          const wordRange = document.getWordRangeAtPosition(
              position,
              this.wordPattern,
          );
          for (const account of Object.keys(this.accounts)) {
            const item = new CompletionItem(
                account,
                CompletionItemKind.EnumMember,
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
