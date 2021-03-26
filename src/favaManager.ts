'use strict';
import * as vscode from 'vscode';
import {existsSync} from 'fs';
import {Extension} from './extension';

export class FavaManager implements vscode.Disposable {
  private _terminal: vscode.Terminal;
  private _terminalClosed: boolean;
  private extension: Extension;

  constructor(extension: Extension) {
    this._terminal = vscode.window.createTerminal('Fava');
    this._terminalClosed = false;
    this.extension = extension;
  }

  onDidCloseTerminal() {
    this._terminalClosed = true;
  }

  openFava(showPrompt = false) {
    this.extension.logger.appendLine('will launch fava...');
    const beanFile = this.extension.getMainBeanFile(); // this is the file given to fava
    if (beanFile.length === 0 || !existsSync(beanFile)) {
      this.extension.logger.appendLine('quit launching fava.');
      vscode.window.showInformationMessage('No valid bean file is available.');
      return;
    }
    if (this._terminalClosed) {
      this._terminal = vscode.window.createTerminal('Fava');
      this.extension.logger.appendLine('created Fava terminal');
    }
    const favaPath = vscode.workspace.getConfiguration('beancount')['favaPath'];
    this._terminal.sendText(
        favaPath + ' -H 127.0.0.1 "'.concat(beanFile, '"'),
        true,
    );
    this.extension.logger.appendLine(
        `executed [${favaPath} -H 127.0.0.1 "${beanFile}"]`,
    );
    if (showPrompt) {
      this._terminal.show();
      const result = vscode.window.showInformationMessage(
          'Fava is running in the terminal below. Do you want to open a browser to view the balances?',
          'Yes',
      );
      result.then((value: string | undefined) => {
        if (value === 'Yes') {
          vscode.commands.executeCommand(
              'vscode.open',
              vscode.Uri.parse('http://127.0.0.1:5000/'),
          );
        }
      });
    }
  }
  dispose() {
    this._terminal.dispose();
  }
}
