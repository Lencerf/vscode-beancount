'use strict';
import * as vscode from 'vscode';
// import { chdir } from 'process'; 
import { existsSync } from 'fs';
import { isAbsolute, join } from 'path';
import { FavaManager } from './favaManager'
import { ActionProvider } from './actionProvider'
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
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider({scheme: "file", language: "beancount"}, extension.actionProvider))
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument( (e:vscode.TextDocumentChangeEvent) => extension.formatter.instantFormat(e) ))
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((e:vscode.TextDocument) => extension.refreshData(context)))
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e:vscode.ConfigurationChangeEvent) => extension.configurationUpdated(e, context)))
    
    extension.refreshData(context);
    if (vscode.workspace.getConfiguration("beancount")["runFavaOnActivate"]) {
        extension.favaManager.openFava(false)
    }

}

export function deactivate() {
}


export class Extension {
    completer: Completer
    actionProvider: ActionProvider
    favaManager: FavaManager
    diagnosticCollection: vscode.DiagnosticCollection
    formatter: Formatter
    logger: vscode.OutputChannel
    flagWarnings: FlagWarnings

    constructor() {
        this.completer = new Completer(this)
        this.actionProvider = new ActionProvider()
        this.favaManager = new FavaManager(this)
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('Beancount')
        this.formatter = new Formatter()
        this.logger = vscode.window.createOutputChannel("Beancount")
        this.flagWarnings = vscode.workspace.getConfiguration("beancount")["flagWarnings"]
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
        var pyArgs = [checkpy, mainBeanFile]
        if (vscode.workspace.getConfiguration("beancount")["completePayeeNarration"]) {
            pyArgs.push("--payeeNarration")
        }
        this.logger.appendLine(`running ${python3Path} ${pyArgs} to refresh data...`)
        run_cmd(python3Path, pyArgs, (text: string) => {
            const errors_completions = text.split('\n', 3)
            this.provideDiagnostics(errors_completions[0], errors_completions[2])
            this.completer.updateData(errors_completions[1])
            this.logger.appendLine("Data refreshed.")
        });
    }

    provideDiagnostics(errors_json: string, flags_json: string) {
        let errors:BeancountError[] = JSON.parse(errors_json)
        let flags:BeancountFlag[] = JSON.parse(flags_json)
        const diagsCollection: { [key: string]: vscode.Diagnostic[] } = {}
        errors.forEach(e => {
            const range = new vscode.Range(new vscode.Position(e.line-1,0),
                new vscode.Position(e.line, 0))
            const diag = new vscode.Diagnostic(range, e.message, vscode.DiagnosticSeverity.Error)
            diag.source = 'Beancount'
            diag.code = DiagnosticCodes.error;
            if (diagsCollection[e.file] === undefined) {
                diagsCollection[e.file] = []
            }
            diagsCollection[e.file].push(diag)
        });
        flags.forEach(f => {
            const warningType = this.flagWarnings[f.flag];
            if (warningType === null || warningType === undefined) {
                return;
            }
            const range = new vscode.Range(new vscode.Position(f.line-1,0),
                new vscode.Position(f.line, 0))
            const diag = new FlagDiagnostic(f.flag, range, f.message, warningType)
            diag.source = 'Beancount'
            if (diagsCollection[f.file] === undefined) {
                diagsCollection[f.file] = []
            }
            diagsCollection[f.file].push(diag)
        })
        this.diagnosticCollection.clear()
        for (const file in diagsCollection) {
            this.diagnosticCollection.set(vscode.Uri.file(file), diagsCollection[file])
        }
    }

    public configurationUpdated(e: vscode.ConfigurationChangeEvent, context: vscode.ExtensionContext) {
        if (e.affectsConfiguration("beancount.flagWarnings")) {
            this.flagWarnings = vscode.workspace.getConfiguration("beancount")["flagWarnings"]
        }
        if (e.affectsConfiguration("beancount.flagWarnings") || e.affectsConfiguration("beancount.python3Path") || e.affectsConfiguration("beancount.mainBeanFile")) {
            this.refreshData(context)
        }
    }
}

export class FlagDiagnostic extends vscode.Diagnostic {
    readonly code: number = DiagnosticCodes.flag
    flag: string

    constructor(flag: string, range: vscode.Range, message: string, severity?: vscode.DiagnosticSeverity) {
        super(range, message, severity);
        this.flag = flag
    }
}

const DiagnosticCodes = {
    error: 1,
    flag: 2,
}

interface BeancountError {
    file: string,
    line: number,
    message: string
}

interface BeancountFlag {
    file: string,
    line: number,
    message: string,
    flag: string
}

interface FlagWarnings {
    [index: string]: vscode.DiagnosticSeverity | null | undefined;
    "*": vscode.DiagnosticSeverity | null,
    "!": vscode.DiagnosticSeverity | null,
    "P": vscode.DiagnosticSeverity | null,
    "S": vscode.DiagnosticSeverity | null,
    "T": vscode.DiagnosticSeverity | null,
    "C": vscode.DiagnosticSeverity | null,
    "U": vscode.DiagnosticSeverity | null,
    "R": vscode.DiagnosticSeverity | null,
    "M": vscode.DiagnosticSeverity | null,
}