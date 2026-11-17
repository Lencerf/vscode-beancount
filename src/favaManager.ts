import * as vscode from "vscode";
import { existsSync } from "fs";
import { Extension } from "./extension";

export class FavaManager implements vscode.Disposable {
  private _terminal: vscode.Terminal | null;
  private extension: Extension;

  constructor(extension: Extension) {
    this._terminal = null;
    this.extension = extension;
  }

  onDidCloseTerminal() {
    this._terminal = null;
  }

  openFava(showPrompt = false) {
    this.extension.logger.appendLine("will launch fava...");
    const beanFile = this.extension.getMainBeanFile(); // file given to fava
    if (beanFile.length === 0 || !existsSync(beanFile)) {
      this.extension.logger.appendLine("quit launching fava.");
      vscode.window.showInformationMessage("No valid bean file is available.");
      return;
    }
    if (this._terminal === null) {
      this._terminal = vscode.window.createTerminal("Fava");
      this.extension.logger.appendLine("created Fava terminal");
    }
    const config = vscode.workspace.getConfiguration("beancount");
    const favaPath = config["favaPath"];
    const favaPort = config.get<number>("favaPort", 5000);
    const portOption = favaPort === 5000 ? "" : ` -p ${favaPort}`;
    const favaCommand = `${favaPath}${portOption} -H 127.0.0.1 "${beanFile}"`;
    this._terminal.sendText(favaCommand, true);
    this.extension.logger.appendLine(`executed [${favaCommand}]`);
    if (showPrompt) {
      this._terminal.show();
      const result = vscode.window.showInformationMessage(
        `Fava is running in the terminal below. Do you want to open a browser
          to view the balances?`,
        "Yes"
      );
      result.then((value: string | undefined) => {
        if (value === "Yes") {
          vscode.commands.executeCommand(
            "vscode.open",
            vscode.Uri.parse(`http://127.0.0.1:${favaPort}/`)
          );
        }
      });
    }
  }
  dispose() {
    if (this._terminal !== null) {
      this._terminal.dispose();
    }
  }
}
