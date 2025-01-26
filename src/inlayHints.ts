import * as vscode from 'vscode';
import { Extension } from './extension';

type Automatics = { [file: string]: { [line: string]: [string] } };

const HINT_DECO = vscode.window.createTextEditorDecorationType({
    ["after"]: {
        color: "#aaa",
        fontStyle: "normal",
    }
});

export class HintsUpdater {
    automatics: Automatics = {};
    extension: Extension;

    constructor(extension: Extension) {
        this.extension = extension;
        vscode.window.onDidChangeVisibleTextEditors(this.onDidChangeVisibleTextEditors, this);
    }

    private isTrackedEditor(e: vscode.TextEditor) {
        return Object.keys(this.automatics).includes(e.document.fileName);
    }

    updateData(data: string) {
        this.automatics = JSON.parse(data);
        vscode.window.visibleTextEditors.filter(this.isTrackedEditor, this).forEach(this.renderDecorations, this);
    }

    private getDotPos(linetext: string) {
        // FIXME: this is very brittle. can we get this info from beancount?
        const res = linetext.match(/\s*(\S+)\s+(?<amount>-?[0-9.]+)(?<whitespace>\s*)(?<currency>[a-zA-Z]+)/);
        const amt = res?.groups?.amount;
        if (!amt) {
            return null;
        }
        return linetext.indexOf(amt) + amt.indexOf(".");
    }

    private padUnits(dotPos: number, curLine: string, units: string) {
        const numSpaces = dotPos - curLine.length - units.indexOf(".");
        // when curLine is too long, numSpaces could be <= 0. just use one space
        const finalPad = Math.max(numSpaces, 1);
        const SPACE = '\u00a0';
        return SPACE.repeat(finalPad) + units;
    }

    private onDidChangeVisibleTextEditors(e: readonly vscode.TextEditor[]) {
        this.extension.logger.appendLine(`Changed visible text editors`);
        // if there is any tracked beancount file open
        e.filter(this.isTrackedEditor, this).forEach(this.renderDecorations, this);
    }

    private renderDecorations(editor: vscode.TextEditor) {
        if (!vscode.workspace.getConfiguration("beancount")["inlayHints"]) {
            return;
        }
        const file = editor.document.fileName;
        this.extension.logger.appendLine(`Rendering hints for ${file}`);

        const hints = Object.entries(this.automatics[file]).map(([lineno, units]) => {
            const line = editor.document.lineAt((+lineno) - 1);
            let dotPos = null;
            for (let prevLineNo = (+lineno) - 2; prevLineNo >= 0; prevLineNo--) {
                const prevLine = editor.document.lineAt(prevLineNo);
                if (prevLine.isEmptyOrWhitespace) {
                    continue;
                }
                if (prevLine.firstNonWhitespaceCharacterIndex === 0) {
                    // probably hit the start of a transaction, bail
                    break;
                }
                dotPos = this.getDotPos(prevLine.text);
                if (dotPos !== null) {
                    break;
                };
            }
            if (dotPos === null) {
                // get values from config
                dotPos = vscode.workspace.getConfiguration("beancount")["separatorColumn"] - 1;
            }
            const hint = units.join(", ");
            const contentText = this.padUnits(dotPos, line.text, hint);

            return {
                range: line.range,
                renderOptions: { ["after"]: { contentText } }
            };
        });
        editor.setDecorations(HINT_DECO, hints);
    }
}
