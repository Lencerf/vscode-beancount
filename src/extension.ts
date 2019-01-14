'use strict';
import * as vscode from 'vscode';
// import { chdir } from 'process'; 
import { existsSync } from 'fs';
import { isAbsolute, join } from 'path';
import { FavaManager } from './favaManager'
import { Completer } from './completer'
import { Formatter } from './formatter'
import { run_cmd } from './utils'

export function activate(context: vscode.ExtensionContext) {

    const extension = new Extension()

    vscode.commands.registerCommand('beancount.runFava', () => extension.favaManager.openFava(true) )

    context.subscriptions.push(vscode.window.onDidCloseTerminal(
        function(terminal:vscode.Terminal) { 
            if (terminal.name == "Fava") {
                extension.favaManager.onDidCloseTerminal()
            }
        }
    ))

    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'beancount'}, extension.completer, '2', '#', '^'))
    context.subscriptions.push(vscode.languages.registerHoverProvider({ scheme: "file", language: "beancount"}, extension.completer))
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument( (e:vscode.TextDocumentChangeEvent) => extension.formatter.instantFormat(e) ))
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((e:vscode.TextDocument) => extension.refreshData(context)))
    
    extension.refreshData(context);
    if (vscode.workspace.getConfiguration("beancount")["runFavaOnActivate"]) {
        extension.favaManager.openFava(false)
    }

}

export function deactivate() {
}


export class Extension {
    completer: Completer
    favaManager: FavaManager
    diagnosticCollection: vscode.DiagnosticCollection
    formatter: Formatter
    logger: vscode.OutputChannel

    constructor() {
        this.completer = new Completer(this)
        this.favaManager = new FavaManager(this)
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('Beancount')
        this.formatter = new Formatter()
        this.logger = vscode.window.createOutputChannel("Beancount")
    }

    public getMainBeanFile(): string {
        this.logger.append("try finding a valid bean file...")
        let mainBeanFile = vscode.workspace.getConfiguration("beancount").get("mainBeanFile")
        if (mainBeanFile == undefined || mainBeanFile == "") {
            this.logger.append("user did not specify a main bean file in settings...")
            if (vscode.window.activeTextEditor != undefined && vscode.window.activeTextEditor.document.languageId == 'beancount') {
                this.logger.appendLine("use the bean file in current editor.")
                return vscode.window.activeTextEditor.document.fileName
            } else {
                this.logger.appendLine("")
                return ""
            }
        } else {
            if (isAbsolute(String(mainBeanFile))) {
                this.logger.appendLine("user specified a main bean file with an absolute path.")
                return String(mainBeanFile)
            } else {
                this.logger.append("user specified a main bean file with a relative path...")
                if (vscode.workspace.workspaceFolders) {
                    this.logger.appendLine("")
                    return join(vscode.workspace.workspaceFolders[0].uri.fsPath, String(mainBeanFile))
                } else {
                    this.logger.appendLine("but there are no workspace folders.")
                    return ""
                }
            }
        }
    }

    refreshData(context: vscode.ExtensionContext) {
        let mainBeanFile = this.getMainBeanFile()
        let checkpy = context.asAbsolutePath("/pythonFiles/beancheck.py")
        let python3Path = vscode.workspace.getConfiguration("beancount")["python3Path"]
        if (mainBeanFile.length == 0 || !existsSync(mainBeanFile)) {
            this.logger.appendLine("find no valid bean files.")
            return
        }
        this.logger.appendLine(`running [${python3Path} ${checkpy} ${mainBeanFile}] to refresh data...`)
        run_cmd(python3Path, [checkpy, mainBeanFile], (text: string) => {
            const errors_completions = text.split('\n', 2)
            this.provideDiagnostics(errors_completions[0])
            this.completer.updateData(errors_completions[1])
            this.logger.appendLine("Data refreshed.")
        });
    }

    provideDiagnostics(output: string) {
        let errors:BeancountError[] = JSON.parse(output)
        const diagsCollection: { [key: string]: vscode.Diagnostic[] } = {}
        errors.forEach(e => {
            const range = new vscode.Range(new vscode.Position(e.line-1,0),
                new vscode.Position(e.line, 0))
            const diag = new vscode.Diagnostic(range, e.message, vscode.DiagnosticSeverity.Error)
            diag.source = 'Beancount'
            if (diagsCollection[e.file] === undefined) {
                diagsCollection[e.file] = []
            }
            diagsCollection[e.file].push(diag)
        });
        this.diagnosticCollection.clear()
        for (const file in diagsCollection) {
            this.diagnosticCollection.set(vscode.Uri.file(file), diagsCollection[file])
        }
    }
}

interface BeancountError {
    file: string,
    line: number,
    message: string
}