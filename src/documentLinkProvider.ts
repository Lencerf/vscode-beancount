import * as vscode from "vscode";
import { isAbsolute } from "path";
import { DocumentLink, Range, TextDocument } from "vscode";
import { getWorkspaceRootUri } from "./utils";

export default class DocumentLinkProvider implements vscode.DocumentLinkProvider {
    public provideDocumentLinks(document: TextDocument): vscode.DocumentLink[] {
        const text = document.getText();
        // Get the directory of current document
        const currentDir = vscode.Uri.joinPath(document.uri, '..');

        const links: DocumentLink[] = [];
        for (const match of text.matchAll(/include\s+"([^"]+.(?:beancount|bean))"/g)) {
            const includedFileName = match[1];

            const range = this.create_range(document, match);
            if (range === undefined) {
                console.error("nothing matched");
                continue;
            }

            // Beancount resolves relative includes against the including file,
            // while absolute includes are used as they are.
            const target = isAbsolute(includedFileName)
                ? vscode.Uri.file(includedFileName)
                : vscode.Uri.joinPath(currentDir, includedFileName);
            const link = new DocumentLink(range, target);
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
