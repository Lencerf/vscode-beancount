import * as vscode from "vscode";
import { DocumentLink, Range, TextDocument } from "vscode";
import { getWorkspaceRootUri } from "./utils";

export default class DocumentLinkProvider implements vscode.DocumentLinkProvider {
    public provideDocumentLinks(document: TextDocument): vscode.DocumentLink[] {
        const text = document.getText();

        const workspaceRootUri = getWorkspaceRootUri();
        if (workspaceRootUri === undefined) {
            console.error('Invalid workspace root path.');
            return [];
        }

        const links: DocumentLink[] = [];
        for (const match of text.matchAll(/include\s+"([^"]+.(?:beancount|bean))"/g)) {
            const includedFileName = match[1];

            const range = this.create_range(document, match);
            if (range === undefined) {
                // Nothing matched.
                console.error("nothing matched");
                continue;
            }

            const link = new DocumentLink(range, vscode.Uri.joinPath(workspaceRootUri, includedFileName));
            link.tooltip = "Follow link";
            links.push(link);
        }

        return links;
    }

    private create_range(document: TextDocument, match: RegExpMatchArray): Range | undefined {
        if (match.index === undefined) {
            // nothing matched.
            return;
        }

        // extend the range by 1 in both sides to include the quote characters.
        const start = document.positionAt(match.index + match[0].length - match[1].length - 2);
        const end = document.positionAt(match.index + match[0].length + 1);
        const r = new Range(start, end);
        return r;
    }
}