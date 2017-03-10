'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Position, Range} from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    vscode.commands.registerCommand('beancount.alignCommodity',()=>{
        // Align commodity for all lines
        let lc = vscode.window.activeTextEditor.document.lineCount;
        for (var i = 0; i < lc; i++) {
            // ommit comments
            if (vscode.window.activeTextEditor.document.lineAt(i).text.trim()[0] != ";") {
                alignSingleLine(i)
            }
        }
    })

    vscode.commands.registerCommand('beancount.insertDate', ()=>{
        const today = new Date();
        let year = today.getFullYear().toString();
        let month = (today.getMonth() + 1 < 10 ? "0" : "") + (today.getMonth() + 1).toString();
        let date = (today.getDate() < 10 ? "0" : "") + today.getDate().toString();
        let dateString = year + '-' + month + '-' + date;
        const originalCursorPosition = vscode.window.activeTextEditor.selection.active
        let r = new Range(originalCursorPosition, originalCursorPosition)
        let edit = new vscode.TextEdit(r, dateString)
        let wEdit = new vscode.WorkspaceEdit();
        wEdit.set(vscode.window.activeTextEditor.document.uri, [edit]);
        vscode.workspace.applyEdit(wEdit);
    })

    let inputCapturer = new InputCapturer()
    context.subscriptions.push(inputCapturer);
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
    const amountRegex = /([\-|\+]?)(?:\d|\d[\d,]*\d)(\.)/
    var amountArray = amountRegex.exec(originalText)
    if (amountArray == null) { return }
    //console.log(amountArray)
    let contentBefore = ("s" + originalText.substring(0, amountArray.index)).trim().substring(1);
    var contentAfterAmount = ""
    if (amountArray.index + amountArray[0].length < originalText.length) {
        // get all the contents after the decimal point
        contentAfterAmount = originalText.substring(amountArray.index + amountArray[0].length)
    }
    let targetDotPosition = vscode.workspace.getConfiguration("beancount")["separatorColumn"] - 1;
    let whiteLength = targetDotPosition - contentBefore.length - (amountArray[0].length - 1)
    if (whiteLength > 0) {
        let newText = contentBefore + (new Array(whiteLength + 1).join(' ')) + amountArray[0] + contentAfterAmount
        let r = new vscode.Range(new Position(line,0), new Position(line, originalText.length))
        let edit = new vscode.TextEdit(r, newText)
        let wEdit = new vscode.WorkspaceEdit();
        wEdit.set(activeEditor.document.uri, [edit]);
        vscode.workspace.applyEdit(wEdit);
        // move cursor position
        
        if (line == originalCursorPosition.line) {
            var newPosition = new Position(originalCursorPosition.line, 1 + originalCursorPosition.character + newText.length - originalLength)
            //console.log(originalCursorPosition, newPosition)
            activeEditor.selection = new vscode.Selection(newPosition, newPosition)
        }
    }
}

// this method is called when your extension is deactivated
export function deactivate() {
}

/**
 * InputCapturer
 */
class InputCapturer {
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
        //console.log(e.contentChanges);
        let text = e.contentChanges[0].text;
        let rangeLength = e.contentChanges[0].rangeLength;
        let line = e.contentChanges[0].range.start.line;
        if (text == "." && rangeLength == 0 && vscode.workspace.getConfiguration("beancount")["instantAlignment"]) {
            // the user just inserted a new decimal point
            alignSingleLine(line) 
        }
        if (text == "\n" && rangeLength == 0) {
            // the user just inserted a new line
            let lineText = vscode.window.activeTextEditor.document.lineAt(line).text
            let transRegex = /([0-9]{4})([\-|/])([0-9]{2})([\-|/])([0-9]{2}) (\*|\!)/
            let transArray = transRegex.exec(lineText)
            if ( transArray != null ) {
                // the user inserted a new line under a transaction
                let r = new Range(new Position(line + 1, 0), new Position(line + 1, 0));
                let edit = new vscode.TextEdit(r, "    ");
                let wEdit = new vscode.WorkspaceEdit();
                wEdit.set(vscode.window.activeTextEditor.document.uri, [edit]);
                vscode.workspace.applyEdit(wEdit); // insert four spaces for a new posting line
            }          
        }
    }
}