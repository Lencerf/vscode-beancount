import * as vscode from 'vscode';
import {FlagDiagnostic} from './extension';

export class ActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
      document: vscode.TextDocument,
      range: vscode.Range,
      context: vscode.CodeActionContext,
      token: vscode.CancellationToken,
  ): vscode.ProviderResult<Array<vscode.Command | vscode.CodeAction>> {
    if (
      context.only !== undefined &&
      context.only !== vscode.CodeActionKind.QuickFix
    ) {
      // We can only provide quick fixes
      return;
    }

    return context.diagnostics
        .map((diag) => {
          if (!(diag instanceof FlagDiagnostic)) {
          // we can only resolve flagged transactions (etc)
            return;
          }

          if (diag.flag === '*') {
          // we can only change flag to okay; if that's already the flag, we can't quickfix it
            return;
          }

          const action = new vscode.CodeAction(
              'Flag as okay',
              vscode.CodeActionKind.QuickFix,
          );
          const workspaceEdit: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
          const flagPosition = this.findFlagPosition(document, range, diag.flag);
          if (flagPosition === undefined) {
            return;
          }

          if (
            document.lineAt(flagPosition.start)
                .firstNonWhitespaceCharacterIndex === flagPosition.start.character
          ) {
          // If the flag is the first thing on the line, this is a posting flag, so rather than changing it to "*" we should delete it
          // and also the whitespace character following it
            workspaceEdit.delete(
                document.uri,
                flagPosition.with(
                    flagPosition.start,
                    flagPosition.end.with(
                        flagPosition.end.line,
                        flagPosition.end.character + 1,
                    ),
                ),
            );
          } else {
          // Otherwise we replace the flag with "*" (FLAG_OKAY)
            workspaceEdit.replace(document.uri, flagPosition, '*');
          }
          action.edit = workspaceEdit;
          return action;
        })
        .filter((e) => e !== undefined) as vscode.CodeAction[];
  }

  findFlagPosition(
      document: vscode.TextDocument,
      range: vscode.Range,
      flag: string,
  ): vscode.Range | undefined {
    let line: vscode.TextLine = document.lineAt(range.start.line);
    let i = 0;

    // Find the first non-empty line in range
    while (line.isEmptyOrWhitespace) {
      line = document.lineAt(range.start.line + i);
      i++;
    }

    const flagCharacterIndex =
      line.text.search(new RegExp('\\s\\' + flag + '\\s')) + 1; // +1 to deal with the leading space in the regex
    if (flagCharacterIndex === 0) {
      // regex didn't match (-1 + 1 == 0)
      return;
    }

    let result: vscode.Range;
    if (line.firstNonWhitespaceCharacterIndex === flagCharacterIndex) {
      result = line.range.with(
          new vscode.Position(line.lineNumber, flagCharacterIndex),
          new vscode.Position(line.lineNumber, flagCharacterIndex + 1),
      );
    } else {
      result = line.range.with(
          new vscode.Position(line.lineNumber, flagCharacterIndex),
          new vscode.Position(line.lineNumber, flagCharacterIndex + 1),
      );
    }
    return result;
  }
}
