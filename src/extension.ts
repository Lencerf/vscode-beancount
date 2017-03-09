'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "beancount" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('extension.sayHello', () => {
        // The code you place here will be executed every time your command is executed

        // Display a message box to the user
        vscode.window.showInformationMessage('Hello World!');
    });

    vscode.commands.registerCommand('extension.alignCommodity',()=>{
        // Align commodity for all lines
        let lc = vscode.window.activeTextEditor.document.lineCount;
        for (var i = 0; i < lc; i++) {
            // ommit comments
            if (vscode.window.activeTextEditor.document.lineAt(i).text.trim()[0] != ";") {
                alignSingleLine(i)
            }
        }
    })

    let controller = new AlignCommodityController()
    context.subscriptions.push(controller);

    context.subscriptions.push(disposable);
}

function alignSingleLine(line: number) {
    let activeEditor = vscode.window.activeTextEditor
    let originalText = activeEditor.document.lineAt(line).text
    // save the original text length and cursor position
    const originalLength = originalText.length
    const originalCursorPosition = vscode.window.activeTextEditor.selection.active
    // find an account name first
    const accountRegex = /([A-Z][A-Za-z0-9\-]+)(:)/
    var accountArray = accountRegex.exec(originalText)
    if (accountArray == null) { return } // A commodity record always accors with an account.
    // find a number with a decimal point
    const amountRegex = /([\-|\+]?)((?:\d|\d[\d,]*\d)?)(\.)/
    var amountArray = amountRegex.exec(originalText)
    if (amountArray == null) { return }
    let contentBefore = ("s" + originalText.substring(0, amountArray.index)).trim().substring(1);
    var contentAfterAmount = ""
    if (amountArray.index + amountArray[0].length < originalText.length) {
        // get all the contents after the decimal point
        contentAfterAmount = originalText.substring(amountArray.index + amountArray[0].length)
    }
    let dotPosition = amountArray.index + amountArray[0].length - 1
    let targetDotPosition = vscode.workspace.getConfiguration("beancount")["separatorColumn"] - 1;
    let whiteLength = targetDotPosition - contentBefore.length - (amountArray[1].length + amountArray[2].length)
    if (whiteLength > 0) {
        let newText = contentBefore + (new Array(whiteLength + 1).join(' ')) + amountArray[0] + contentAfterAmount
        let r = new vscode.Range(new vscode.Position(line,0), new vscode.Position(line, originalText.length))
        let edit = new vscode.TextEdit(r, newText)
        let wEdit = new vscode.WorkspaceEdit();
        wEdit.set(activeEditor.document.uri, [edit]);
        vscode.workspace.applyEdit(wEdit);
        // move cursor position
        
        if (line == originalCursorPosition.line) {
            var newPosition = new vscode.Position(originalCursorPosition.line, 1 + originalCursorPosition.character + newText.length - originalLength)
            //console.log(originalCursorPosition, newPosition)
            activeEditor.selection = new vscode.Selection(newPosition, newPosition)
        }
    }
}

// this method is called when your extension is deactivated
export function deactivate() {
}

/**
 * AlignCommodityController
 */
class AlignCommodityController {
    private _disposable: vscode.Disposable;

    constructor() {
        let subscriptions: vscode.Disposable[] = [];
        vscode.workspace.onDidChangeTextDocument(this._onEvent, this, subscriptions);

        this._disposable = vscode.Disposable.from(...subscriptions);
    }

    dispose() {
        this._disposable.dispose();
    }

    private _onEvent(e: vscode.TextDocumentChangeEvent) {
        console.log(e.contentChanges);
        let text = e.contentChanges[0].text;
        let rangeLength = e.contentChanges[0].rangeLength;
        let line = e.contentChanges[0].range.start.line;
        if (text == "." && rangeLength == 0) {
            // the user just inserted a new decimal point
            alignSingleLine(line) 
        }
    }
}