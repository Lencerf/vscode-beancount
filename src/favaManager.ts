'use strict';
import * as vscode from 'vscode';
import { chdir } from 'process'; 
import { existsSync } from 'fs';

export class FavaManager implements vscode.Disposable {
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