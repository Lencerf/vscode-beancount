'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Position, Range} from 'vscode';
import { chdir } from 'process'; 
import { existsSync } from 'fs';
import { spawn } from 'child_process';

class FavaManager implements vscode.Disposable {
    private _terminal: vscode.Terminal
    private _terminalClosed: boolean
    constructor() {
        this._terminal = vscode.window.createTerminal("Fava");
        this._terminalClosed = false
    }

    public onDidCloseTerminal() {
        this._terminalClosed = true
    }
    
    public openFava(showPrompt=false) {
        if(vscode.workspace.workspaceFolders != undefined ) {
            chdir(vscode.workspace.workspaceFolders[0].uri.path)
        }
        let beanFile = ""
        if (existsSync(vscode.workspace.getConfiguration("beancount")["mainBeanFile"])) {
            beanFile = vscode.workspace.getConfiguration("beancount")["mainBeanFile"]
        } else if (vscode.window.activeTextEditor != undefined &&
            vscode.window.activeTextEditor.document.languageId == 'beancount') {
            beanFile = vscode.window.activeTextEditor.document.fileName
        } else {
            vscode.window.showInformationMessage("The current file is not a bean file!")
            return
        }
        if (this._terminalClosed) {
            this._terminal = vscode.window.createTerminal("Fava")
        }
        if(vscode.workspace.workspaceFolders != undefined) {
            this._terminal.sendText('cd "'.concat(vscode.workspace.workspaceFolders[0].uri.path, '"'), true)
        }
        let favaPath = vscode.workspace.getConfiguration("beancount")["favaPath"]
        this._terminal.sendText(favaPath + ' -H 127.0.0.1 "'.concat(beanFile, '"'), true) 
        if (showPrompt) {
            this._terminal.show()
            let result = vscode.window.showInformationMessage("Fava is running in the terminal below. Do you want to open a browser to view the balances?", "Yes")
            result.then((value:string | undefined)=>{
                if(value == "Yes") {
                    vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(
                        "http://127.0.0.1:5000/"))
                }
            })
        }
    }
    public dispose() {
        this._terminal.dispose()
    }
}


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    const favaManager = new FavaManager()

    var bcDiag = vscode.languages.createDiagnosticCollection('Beancount')

    if (vscode.workspace.getConfiguration("beancount")["runFavaOnActivate"]) {
        favaManager.openFava(false)
    }

    vscode.commands.registerCommand('beancount.runFava', ()=>{   
        favaManager.openFava(true)
    })

    vscode.commands.registerCommand('beancount.alignCommodity',()=>{
        if (vscode.window.activeTextEditor == undefined) {
            return
        }
        // Align commodity for all lines
        let lc = vscode.window.activeTextEditor.document.lineCount;
        for (var i = 0; i < lc; i++) {
            // omit comments
            if (vscode.window.activeTextEditor.document.lineAt(i).text.trim()[0] != ";") {
                alignSingleLine(i)
            }
        }
    })

    vscode.commands.registerCommand('beancount.insertDate', ()=>{
        if (vscode.window.activeTextEditor == undefined) {
            return
        }
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


    context.subscriptions.push(vscode.window.onDidCloseTerminal(
        function(terminal) { 
            if (terminal.name == "Fava") {
                favaManager.onDidCloseTerminal()
            }
        }
    ))
    

    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e:vscode.TextDocumentChangeEvent)=>{
        if (vscode.window.activeTextEditor == undefined) {
            return
        }
        if (e.contentChanges.length == 0) {
            //protect against empty contentChanges arrays...
            return;
        }
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
        if (vscode.window.activeTextEditor == undefined) {
            return
        }
        let mainBeanFile = vscode.window.activeTextEditor.document.fileName
        if(vscode.window.activeTextEditor.document.languageId != 'beancount') {
            return
        }
        if (vscode.workspace.workspaceFolders != undefined) {
            chdir(vscode.workspace.workspaceFolders[0].uri.path)
        }
        if (existsSync(vscode.workspace.getConfiguration("beancount")["mainBeanFile"])) {
            mainBeanFile = vscode.workspace.getConfiguration("beancount")["mainBeanFile"]
        }
        let checkpy = context.asAbsolutePath("/pythonFiles/beancheck.py")
        let python3Path = vscode.workspace.getConfiguration("beancount")["python3Path"]
        bcDiag.clear()
        run_cmd(python3Path, [checkpy, mainBeanFile], function(text: string) {
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

function run_cmd(cmd:string, args:Array<string>, callBack: (stdout: string) => void) {
    var child = spawn(cmd, args);
    var resp = "";
    child.stdout.on('data', function (buffer) { resp += buffer.toString() });
    child.stdout.on('end', function() { callBack (resp) });
}

function alignSingleLine(line: number) {
    if(vscode.window.activeTextEditor == undefined) {
        return
    }
    let activeEditor = vscode.window.activeTextEditor
    let originalText = activeEditor.document.lineAt(line).text
    // save the original text length and cursor position
    const originalCursorPosition = activeEditor.selection.active
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
        vscode.workspace.applyEdit(wEdit).then(function(value) {
            if (value && line == originalCursorPosition.line) {
                activeEditor.selection = new vscode.Selection(line, targetDotPosition+1, line, targetDotPosition+1);
            }
        });
    }
}

// this method is called when your extension is deactivated
export function deactivate() {
}