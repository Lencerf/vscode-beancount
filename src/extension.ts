'use strict';
import * as vscode from 'vscode';
import { Position, Range} from 'vscode';
import { spawn } from 'child_process';
import { existsSync } from 'fs';

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

    //let inputCapturer = new InputCapturer()
    //context.subscriptions.push(inputCapturer);

    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e:vscode.TextDocumentChangeEvent)=>{
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
                let tabSize = vscode.workspace.getConfiguration("editor")["tabSize"];
                let edit = new vscode.TextEdit(r, ' '.repeat(tabSize));
                let wEdit = new vscode.WorkspaceEdit();
                wEdit.set(vscode.window.activeTextEditor.document.uri, [edit]);
                vscode.workspace.applyEdit(wEdit); // insert spaces for a new posting line
            }
        }
    }))


    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((e:vscode.TextDocument) => {
        let mainBeanFile = vscode.window.activeTextEditor.document.fileName
        if(vscode.window.activeTextEditor.document.languageId != 'beancount') {
            return
        }
        if (existsSync(vscode.workspace.getConfiguration("beancount")["mainBeanFile"])) {
            mainBeanFile = vscode.workspace.getConfiguration("beancount")["mainBeanFile"]
        }
        let checkpy = context.asAbsolutePath("/pythonFiles/beancheck.py")

        let bcDiag = vscode.languages.createDiagnosticCollection('Beancount')
        bcDiag.clear()

        run_cmd('python3', [checkpy, mainBeanFile], function(text) {
            var lines = text.split('\n').filter(line=>line.length>0);
            const diagsCollection: { [key: string]: vscode.Diagnostic[] } = {}
            lines.forEach(line => {
                let results = line.split('\t\t', 3)
                const range = new vscode.Range(new vscode.Position(+results[1]-1,0),
                    new vscode.Position(+results[1], 0))
                const diag = new vscode.Diagnostic(range, results[2], vscode.DiagnosticSeverity.Error)
                diag.source = 'Beancount'
                if (diagsCollection[results[0]] === undefined) {
                    diagsCollection[results[0]] = []
                }
                diagsCollection[results[0]].push(diag)
            });
            for (const file in diagsCollection) {
                bcDiag.set(vscode.Uri.file(file), diagsCollection[file])
            }
        });
    }))
}

function run_cmd(cmd, args, callBack) {
    var spawn = require('child_process').spawn;
    var child = spawn(cmd, args);
    var resp = "";

    child.stdout.on('data', function (buffer) { resp += buffer.toString() });
    child.stdout.on('end', function() { callBack (resp) });
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
    if (accountArray == null) { return } // A commodity record always starts with an account.
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
