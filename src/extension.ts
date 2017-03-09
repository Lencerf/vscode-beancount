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

    function alignSingleLine(line: number) {
        const amountRegex = /([\-|\+]?)((?:\d|\d[\d,]*\d)?)(\.\d*)\s*([A-Z][A-Z0-9\'\.\_\-]{0,22}[A-Z0-9])/
        let activeEditor = vscode.window.activeTextEditor;
        let lineText = activeEditor.document.lineAt(line).text;
        var resultArray = amountRegex.exec(lineText);
        if (resultArray != null) {// && accountArray != null) {
            // add 's' to the begin of a transation
            let contentBefore = ("s" + lineText.substring(0, resultArray.index)).trim().substring(1);
            var contentAfterAmount = ""
            if (resultArray.index + resultArray[0].length < lineText.length) {
                contentAfterAmount = lineText.substring(resultArray.index + resultArray[0].length)
            }
            //console.log("comments", contentAfterAmount, "resultArray.index=", resultArray.index)
            let dotPosition = resultArray.index + resultArray[1].length + resultArray[2].length;
            //console.log(lineText[dotPosition], dotPosition);
            // find the position to insert spaces
            // zero-based decimal position
            let targetDecimalPosition = vscode.workspace.getConfiguration("beancount")["separatorColumn"] - 1;
            let whiteLength = targetDecimalPosition - contentBefore.length - (resultArray[1].length + resultArray[2].length)
            if (whiteLength > 0) {
                let newLineText = contentBefore + (new Array(whiteLength + 1).join(' ')) + resultArray[0] + contentAfterAmount
                let r = new vscode.Range(new vscode.Position(line,0), new vscode.Position(line, lineText.length))
                let edit = new vscode.TextEdit(r, newLineText)
                let wEdit = new vscode.WorkspaceEdit();
                wEdit.set(activeEditor.document.uri, [edit]);
                vscode.workspace.applyEdit(wEdit);
            } else {
                return
            }

        } else {
            return
        }
    }

    context.subscriptions.push(vscode.commands.registerCommand('extension.alignCommodity',()=>{
        // Align commodity for all lines
        let lc = vscode.window.activeTextEditor.document.lineCount;
        for (var i = 0; i < lc; i++) {
            // ommit comments
            if (vscode.window.activeTextEditor.document.lineAt(i).text.trim()[0] != ";") {
                alignSingleLine(i)
            }
        }
    }))


    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}