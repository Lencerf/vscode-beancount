import { get } from "http";
import * as vscode from "vscode";

// TODO: We have to think whether we want to have more levels, but for now we will keep it as it was before
const LEVEL1_SYMBOL_KIND = vscode.SymbolKind.Class;
const LEVEL_ABOVE_1_SYMBOL_KIND = vscode.SymbolKind.Function;
const DUMMY_SYMBOL_NAME = "_"; // used for filling missing levels

interface BlockData {
  name: string;
  level: number;
  kind: vscode.SymbolKind;
  start: vscode.TextLine;
  end: vscode.TextLine;
}

class LevelDocumentSymbol extends vscode.DocumentSymbol {
  level: number;

  constructor(
    name: string,
    detail: string,
    kind: vscode.SymbolKind,
    range: vscode.Range,
    selectionRange: vscode.Range,
    level: number
  ) {
    super(name, detail, kind, range, selectionRange);
    this.level = level;
  }
}

function createSymbol(block: BlockData): LevelDocumentSymbol {
  return new LevelDocumentSymbol(
    block.name,
    "",
    block.kind,

    // line number range for entire symbol block
    new vscode.Range(block.start.range.start, block.end.range.end),

    // where to put line highlighting
    new vscode.Range(
      new vscode.Position(block.start.lineNumber, block.level + 1),
      new vscode.Position(block.start.lineNumber, block.start.text.length)
    ),
    block.level
  );
}

/**
 * This class encapsulates logic of building a tree of symbols, when the symbols are added in the order of their 
 * appearance in the document
 * It handles all the combination of situations, when the level of the new symbol is larger or smaller than the level 
 * of the last symbol including the situation when the level difference is greater than 1
 * 
 */
class SymbolsHierarchyBuilder {
  /*
  The lastSymbolsPerLevel array keeps the last symbol for each level. Every time a method addBlockData is called, this
  array is updated and possibly reshaped

  E.g. having processed the following lines:

  *   1      Level1
  **  1.2    Level2
  *** 1.2.1  Level3

  the lastSymbolsPerLevel will hold the following data ["1      Level1", "1.2    Level2", "1.2.1  Level3"]

  Once the following extra line is processed:

  *   1      Level1
  **  1.2    Level2
  *** 1.2.1  Level3
  *   2      Level1   <== New extra line line, processed

  the lastSymbolsPerLevel will be re-shaped, updated and will hold the following data ["2      Level1"]
  */
  lastSymbolsPerLevel: LevelDocumentSymbol[];
  /*
  allRootSymbols array keeps all the root symbols (which are the symbols with the level 1). These symbols in tern
  may have children, which are the 2nd level symbols, which in turn may have 3rd level children etc
  Hence allRootSymbols array holds a hierarchy of symbols, which we will be returning as the result
  There is no need to return the children (anything above level 1), as they are already included as the root symbols' 
  children 
  */
  allRootSymbols: LevelDocumentSymbol[] = [];
  
  constructor() {
    this.lastSymbolsPerLevel = [];
    this.allRootSymbols = [];
  }

  addBlockData(blockData: BlockData) {
    
    let symbol: LevelDocumentSymbol = createSymbol(blockData);

    if (symbol.level < 1) {
      throw new Error("Symbol level should be greater than 0");
    }
    
    if (symbol.level === 1) {
      this.allRootSymbols.push(symbol);
      this.lastSymbolsPerLevel = [symbol];
      return;
    } 

    let diffWithLastLevel: number = symbol.level - this.lastSymbolsPerLevel.length;
    
    /*
    First handing  the situation when the level of the new symbol is smaller than the level of the last symbol

    Like this:

    *     1     level 1
    * *   1.1   level 2
    * * * 1.1.1 level 3   <= previous level 
    * *   1.2   level 2   <= current level
    
    Or like this:
    
    *     1     level 1
    * *   1.1   level 2
    * * * 1.1.1 level 3   <= previous level 
    * *   1.1.2 level 2   <= current level
    */
    if (diffWithLastLevel <= 0 ) {
      // Push this symbol as a child of the last symbol with the level one level up the hierarchy 
      // (which means one level lower in terms of the level number)
      // Since the 1st element of array keeps the level 1, but has an index 0, we need to subtract 2 from the level
      this.lastSymbolsPerLevel[symbol.level - 2].children.push(symbol);

      // Now we make the array to be the same length as the level
      this.lastSymbolsPerLevel = this.lastSymbolsPerLevel.slice(0, symbol.level);
      // finally we update the symbol being added as the last symbol for this level
      this.lastSymbolsPerLevel[symbol.level - 1] = symbol;
      return;
    }

    /*
    Here looking at the situation, when the level of the new symbol is greater than the level of the last symbol by one

    *    1     level 1   <= previous level 
    **   1.1   level 2   < = current level
    */
    if (diffWithLastLevel == 1 ) {
      // Push this symbol as a child of the last symbol with the level one level up the hierarchy 
      // (which means one level lower in terms of the level number)
      this.lastSymbolsPerLevel[symbol.level - 2].children.push(symbol);
      // Extend the array with the new symbol, as the new symbol has the level with the number, 1 bigger than the 
      // last one
      this.lastSymbolsPerLevel.push(symbol);
      return;
    }

    /*
    Here looking at the situation, when the level of the new symbol is greater than the level of the last symbol 
    by more than one (so one or more levels are skipped)

    E.g. Like this:
    *     1       level 1   <= previous level 
    ***   1.1.1   level 3   < = current level (level 2 is skipped)

    VS Code does not support this kind of hierarchy in the OUTLINE window natively, as in a normal computer language 
    (e.g. JavaScrip) this would not be a valid situation. But since in beancount it is possible, 
    (as it is not being checked), we need to be able to handle this situation as well.
    
    To work around this, we fill missing levels with dummy symbols, with the name "_"

    If the level difference is more than 2, then this part of the code will call itself recursively, until the level 
    difference is 1
     */

    if (diffWithLastLevel > 1) {
      // creating a shallow copy of the blockData object and then converting it to the dummy blockData 
      // with level lower than the current level
      const dummyBlockData: BlockData = { ...blockData };
      dummyBlockData.name = DUMMY_SYMBOL_NAME;
      dummyBlockData.level = dummyBlockData.level - 1;
      if (dummyBlockData.level === 1) {
        dummyBlockData.kind = LEVEL1_SYMBOL_KIND;
      }
      this.addBlockData(dummyBlockData);
      this.addBlockData(blockData);
    }

  }

  getSymbolsHierarchy(): LevelDocumentSymbol[] {
    return this.allRootSymbols;
  }

}

function parseLine(text: string): BlockData {
  const data: BlockData = {
    name: "",
    level: 0,
    kind: LEVEL1_SYMBOL_KIND,
    start: {} as vscode.TextLine,
    end: {} as vscode.TextLine,
  };
  for (let i = 0; i < text.length; i++) {
    const element = text[i];

    // avoid any comments like ;#region
    if (element === ";") {
      break;
    }

    if (element === "*") {
      data.level++;
    } else {
      data.name += element;
    }
  }
  if (data.level > 1) {
    data.kind = LEVEL_ABOVE_1_SYMBOL_KIND;
  }
  data.name = data.name.trim();
  return data;
}


export class SymbolProvider implements vscode.DocumentSymbolProvider {

  async provideDocumentSymbols(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): Promise<vscode.DocumentSymbol[]> {


    const  symbolsHierarchyBuilder = new SymbolsHierarchyBuilder();

    let lineNumber = 0;

    while (lineNumber < document.lineCount) {
      const currentLine = document.lineAt(lineNumber);
      lineNumber++;

      // blocks start with 1 or more asterisks (*), where amount of asterisks determines the level of the block
      // https://beancount.github.io/docs/beancount_language_syntax.html#comments
      if (!currentLine.text.startsWith("*")) {
        continue;
      }

      const blockData: BlockData = parseLine(currentLine.text);

      if (!blockData.name) {
        // detect case where name is not yet provided
        continue;
      }

      blockData.start = currentLine;
      blockData.end = currentLine;

      // search for the end of this heading block
      while (lineNumber < document.lineCount) {
        const line = document.lineAt(lineNumber);
        if (!line.text.startsWith("*")) {
          blockData.end = line;
          lineNumber++;
        } else {
          break;
        }
      }

        symbolsHierarchyBuilder.addBlockData(blockData);
    }

    return  symbolsHierarchyBuilder.getSymbolsHierarchy();
  }
}
