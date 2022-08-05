import * as vscode from 'vscode';

interface BlockData {
  name: string,
  level: number,
  kind: vscode.SymbolKind,
  start: vscode.TextLine,
  end: vscode.TextLine,
}

class LevelDocumentSymbol extends vscode.DocumentSymbol {
  level: number;

  constructor(name: string, detail: string, kind: vscode.SymbolKind,
      range: vscode.Range, selectionRange: vscode.Range, level: number) {
    super(name, detail, kind, range, selectionRange);
    this.level = level;
  }
}

export class SymbolProvider implements vscode.DocumentSymbolProvider {
  private parseText(text: string): BlockData {
    const data: BlockData = {
      name: '',
      level: 0,
      kind: vscode.SymbolKind.Class,
      start: {} as vscode.TextLine,
      end: {} as vscode.TextLine,
    };
    for (let i = 0; i < text.length; i++) {
      const element = text[i];

      // avoid any comments like ;#region
      if (element === ';') {
        break;
      }

      if (element === '*') {
        data.level++;
      } else {
        data.name += element;
      }
    }
    if (data.level > 1) {
      data.kind = vscode.SymbolKind.Function;
    }
    data.name = data.name.trim();
    return data;
  }

  private createSymbol(block: BlockData): LevelDocumentSymbol {
    return new LevelDocumentSymbol(
        block.name,
        '',
        block.kind,

        // line number range for entire symbol block
        new vscode.Range(block.start.range.start, block.end.range.end),

        // where to put line highlighting
        new vscode.Range(
            new vscode.Position(
                block.start.lineNumber,
                block.level+1,
            ),
            new vscode.Position(
                block.start.lineNumber,
                block.start.text.length,
            ),
        ),
        block.level,
    );
  }

  async provideDocumentSymbols(
      document: vscode.TextDocument,
      _token: vscode.CancellationToken,
  ): Promise<vscode.DocumentSymbol[]> {
    const allSymbols: LevelDocumentSymbol[] = [];
    let lineNumber = 0;

    while (lineNumber < document.lineCount) {
      const currentLine = document.lineAt(lineNumber);
      lineNumber++;

      // blocks start with 1 or 2 asterisks (*)
      // https://beancount.github.io/docs/beancount_language_syntax.html#comments
      if (!currentLine.text.startsWith('*')) {
        continue;
      }

      const result: BlockData = this.parseText(currentLine.text);

      if (!result.name) {
        // detect case where name is not yet provided
        continue;
      }

      result.start = currentLine;
      result.end = currentLine;

      // search for the end of this heading block
      while (lineNumber < document.lineCount) {
        const line = document.lineAt(lineNumber);
        if (!line.text.startsWith('*')) {
          result.end = line;
          lineNumber++;
        } else {
          break;
        }
      }

      // check if this symbol should be a child or not
      const lastSymbol = allSymbols[allSymbols.length-1];
      if (lastSymbol && lastSymbol.level < result.level) {
        lastSymbol.children.push(this.createSymbol(result));
      } else {
        allSymbols.push(this.createSymbol(result));
      }
    }

    return allSymbols;
  }
}
