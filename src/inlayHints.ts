import * as vscode from 'vscode';
import { Extension } from './extension';

interface InlayHintStyle {
    decorationType: vscode.TextEditorDecorationType;
    decorationOptions: vscode.DecorationOptions;
};
type Automatics = { [file: string]: { [line: string]: string } };

export class HintsUpdater implements vscode.Disposable {
    automatics: Automatics = {};
    extension: Extension;
    constructor(extension: Extension) {
        this.extension = extension;
    }

    updateData(data: string) {
        this.extension.logger.appendLine("Got data");
        this.automatics = JSON.parse(data).automatics;
        this.renderDecorations();
    }

    private getCurrencyCol(linetext: string) {
        this.extension.logger.appendLine(linetext);
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

    renderDecorations() {
        let file = vscode.window.activeTextEditor?.document.fileName;
        if (!file)
            return;
        let doc = vscode.window.activeTextEditor?.document;
        if (!doc)
            return;

        for (const [lineno, units] of Object.entries(this.automatics[file])) {
            let line = doc.lineAt((+lineno) - 1);
            let prevLine = doc.lineAt((+lineno) - 2);
            let text = this.padAmount(prevLine.text, line.text, units);
            let dt = vscode.window.createTextEditorDecorationType({
                ["after"]: {
                    color: "#aaa",
                    fontStyle: "normal",
                    contentText: text,
                }
            });
            vscode.window.activeTextEditor?.setDecorations(dt, [line.range]);
        }
    }
    dispose() {

    }
}