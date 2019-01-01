import * as vscode from 'vscode';
import { Position, TextDocument, CancellationToken, CompletionContext} from 'vscode';
import { Extension } from './extension';
import { EOL } from 'os';

interface Account {
    open: string
    close: string
    currencies: string
    balance: string
}

interface CompletionData {
    accounts: {[name:string]: Account }
    commodities: string[]
    payees: string[]
    narrations: string[]
}

export class Completer implements vscode.CompletionItemProvider, vscode.HoverProvider {

    extension: Extension
    accounts: {[name:string]: Account }
    payees: string[]
    narrations: string[]
    commodities: string[]
    wordPattern: RegExp

    constructor(extension: Extension) {
        this.extension = extension
        this.accounts = {}
        this.payees = []
        this.narrations = []
        this.commodities = []
        this.wordPattern = new RegExp("[A-zÀ-ÿ:-]+|[\\d.]+|[\\d-/]|(\"[A-zÀ-ÿ- ]+\")")
    }

    updateData(output:string) {
        const data:CompletionData = JSON.parse(output)
        this.accounts = data.accounts
        this.commodities = data.commodities
        this.payees = data.payees
        this.narrations = data.narrations
    }

    describeAccount(name: string, simple: boolean): string | vscode.MarkdownString {
        if(name in this.accounts) {
            if (simple) {
                return new vscode.MarkdownString(name + "\n\nbalance: " + this.accounts[name].balance) 
            }
            var lines = [
                name,
                "balance: " + this.accounts[name].balance,
                "opened on " + this.accounts[name].open
            ]
            if (this.accounts[name].close.length > 0) {
                lines.push("closed on " + this.accounts[name].close) 
            }
            if (this.accounts[name].currencies.length > 0) {
                lines.push("currencies: " + this.accounts[name].currencies)
            }
            return lines.join(EOL)
        } else {
            return ""
        }

    }

    provideHover(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken) :
    Thenable<vscode.Hover> {
        return new Promise((resolve, _reject) => {
            const wordRange = document.getWordRangeAtPosition(position, this.wordPattern)
            const account_name = document.getText(wordRange)
            const description = this.describeAccount(account_name, true)
            if (description != "") {
                resolve(new vscode.Hover(description, wordRange))
            } else {
                resolve()
            }
        })
    }

    provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
        return new Promise((resolve, _reject) => {
            var list: vscode.CompletionItem[] = []
            if(document.lineAt(position.line).text[position.character-1] == '-') {
                return
            }
            if (document.lineAt(position.line).text[0] == " ") {
                for(let account in this.accounts) {
                    const item = new vscode.CompletionItem(account, vscode.CompletionItemKind.Variable)
                    item.documentation = this.describeAccount(account, false)
                    list.push(item)
                }
                this.commodities.forEach((v, i, a) => {
                    list.push(new vscode.CompletionItem(v, vscode.CompletionItemKind.Unit))
                })
            } else {
                if(context.triggerCharacter == '2') {
                    if(position.character == 1) {
                        let today = new Date()
                        let year = today.getFullYear().toString();
                        let month = (today.getMonth() + 1 < 10 ? "0" : "") + (today.getMonth() + 1).toString();
                        let date = (today.getDate() < 10 ? "0" : "") + today.getDate().toString();
                        let dateString = year + '-' + month + '-' + date;
                        let item_today = new vscode.CompletionItem(dateString, vscode.CompletionItemKind.Event)
                        item_today.documentation = "today"
                        list.push(item_today)
                    }
                    resolve(list)
                    return
                } else {
                    const lineparts = document.lineAt(position.line).text.split(' ').filter(part => part.length > 0)
                    if (lineparts.length == 3) {
                        this.payees.forEach((v, i, a) => {
                            const payee = new vscode.CompletionItem(v, vscode.CompletionItemKind.Constant)
                            list.push(payee)
                        })
                    }
                    this.narrations.forEach((v, i, a) => {
                        list.push(new vscode.CompletionItem(v, vscode.CompletionItemKind.Text))
                    })
                }
            }
            resolve(list)
        })
    }
}