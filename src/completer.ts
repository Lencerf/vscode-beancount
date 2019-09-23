import * as vscode from 'vscode';
import {
  Position,
  TextDocument,
  CancellationToken,
  CompletionContext,
} from 'vscode';
import { Extension } from './extension';
import { EOL } from 'os';

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

  constructor(extension: Extension) {
    this.extension = extension;
    this.accounts = {};
    this.payees = [];
    this.narrations = [];
    this.commodities = [];
    this.tags = [];
    this.links = [];
    this.wordPattern = new RegExp('[A-Za-z:]+\\S+|"([^\\\\"]|\\\\")*"');
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
        resolve();
      }
    });
  }

  provideCompletionItems(
    document: TextDocument,
    position: Position,
    token: CancellationToken,
    context: CompletionContext
  ): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
    return new Promise((resolve, _reject) => {
      if (context.triggerCharacter === '#') {
        const list = this.tags.map((value, index, array) => {
          return new vscode.CompletionItem(
            value,
            vscode.CompletionItemKind.Variable
          );
        });
        resolve(list);
        return;
      } else if (context.triggerCharacter === '^') {
        const list = this.links.map((value, index, array) => {
          return new vscode.CompletionItem(
            value,
            vscode.CompletionItemKind.Reference
          );
        });
        resolve(list);
        return;
      }
      const list: vscode.CompletionItem[] = [];
      if (document.lineAt(position.line).text[position.character - 1] === '-') {
        return;
      }
      if (document.lineAt(position.line).text[0] === ' ') {
        const wordRange = document.getWordRangeAtPosition(
          position,
          this.wordPattern
        );
        for (const account of Object.keys(this.accounts)) {
          const item = new vscode.CompletionItem(
            account,
            vscode.CompletionItemKind.EnumMember
          );
          item.documentation = this.describeAccount(account);
          item.range = wordRange;
          list.push(item);
        }
        this.commodities.forEach((v, i, a) => {
          const item = new vscode.CompletionItem(
            v,
            vscode.CompletionItemKind.Unit
          );
          item.range = wordRange;
          list.push(item);
        });
      } else {
        if (context.triggerCharacter === '2') {
          if (position.character === 1) {
            const today = new Date();
            const year = today.getFullYear().toString();
            const month =
              (today.getMonth() + 1 < 10 ? '0' : '') +
              (today.getMonth() + 1).toString();
            const date =
              (today.getDate() < 10 ? '0' : '') + today.getDate().toString();
            const dateString = year + '-' + month + '-' + date;
            const itemToday = new vscode.CompletionItem(
              dateString,
              vscode.CompletionItemKind.Event
            );
            itemToday.documentation = 'today';
            list.push(itemToday);
          }
          resolve(list);
          return;
        } else if (
          vscode.workspace.getConfiguration('beancount')[
            'completePayeeNarration'
          ]
        ) {
          const lineParts = document
            .lineAt(position.line)
            .text.split(' ')
            .filter(part => part.length > 0);
          if (lineParts.length === 3) {
            this.payees.forEach((v, i, a) => {
              const payeeItem = new vscode.CompletionItem(
                v,
                vscode.CompletionItemKind.Constant
              );
              list.push(payeeItem);
            });
          }
          this.narrations.forEach((v, i, a) => {
            const narrationItem = new vscode.CompletionItem(
              v,
              vscode.CompletionItemKind.Text
            );
            list.push(narrationItem);
          });
        }
      }
      resolve(list);
    });
  }
}
