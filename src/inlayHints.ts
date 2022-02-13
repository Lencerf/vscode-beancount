import assert = require('assert');
import * as vscode from 'vscode';
import { Extension } from './extension';

interface InlayHintStyle {
    decorationType: vscode.TextEditorDecorationType;
    decorationOptions: vscode.DecorationOptions;
};
type Automatics = { [file: string]: { [line: string]: string } };

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
        vscode.workspace.onDidChangeTextDocument(this.onDidChangeTextDocument, this);
        vscode.window.onDidChangeVisibleTextEditors(this.renderDecorations, this);
    }

    updateData(data: string) {
        this.extension.logger.appendLine("Got data");
        this.automatics = JSON.parse(data).automatics;
        this.renderDecorations();
    }

    private getCurrencyCol(linetext: string) {
        let res = linetext.match(/\s*(\S+)\s+(?<amount>[0-9.\-]+)(?<whitespace>\s*)(?<currency>\S+)/);
        let amt = res?.groups?.amount;
        if (!amt)
            return undefined;

        return { pos: linetext.indexOf(amt), amount: res?.groups?.amount ?? "", whitespace: res?.groups?.whitespace ?? "", currency: res?.groups?.currency ?? "" };
    }

    private padAmount(prevLine: string, curLine: string, units: string) {
        const groups = this.getCurrencyCol(prevLine);
        if (!groups)
            return units;
        const endpos = groups.pos + groups.amount.length + groups.whitespace.length;
        const SPACE = '\u00a0';
        return units.padStart(endpos - curLine.length + units.split(" ")[1].length, SPACE);
    }

    onDidChangeTextDocument({ contentChanges, document }: vscode.TextDocumentChangeEvent) {
        if (contentChanges.length === 0 || !Object.keys(this.automatics).includes(document.fileName))
            return;
        this.renderDecorations();
    }

    renderDecorations() {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const file = editor.document.fileName;
        this.extension.logger.appendLine(`Rendering hints for ${file}`);

        const hints = Object.entries(this.automatics[file]).map(([lineno, units]) => {
            assert(editor);
            const line = editor.document.lineAt((+lineno) - 1);
            const prevLine = editor.document.lineAt((+lineno) - 2);
            const contentText = this.padAmount(prevLine.text, line.text, units);

            return {
                range: line.range,
                renderOptions: { ["after"]: { contentText } }
            };
        });
        editor.setDecorations(HINT_DECO, hints);
    }
}