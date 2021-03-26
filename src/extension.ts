'use strict';
import * as vscode from 'vscode';
// import { chdir } from 'process';
import {existsSync} from 'fs';
import {isAbsolute, join} from 'path';
import {FavaManager} from './favaManager';
import {ActionProvider} from './actionProvider';
import {Completer} from './completer';
import {Formatter} from './formatter';
import {runCmd} from './utils';

export function activate(context: vscode.ExtensionContext) {
  const extension = new Extension(context);

  vscode.commands.registerCommand('beancount.runFava', () =>
    extension.favaManager.openFava(true),
  );

  context.subscriptions.push(
      vscode.window.onDidCloseTerminal((terminal: vscode.Terminal) => {
        if (terminal.name === 'Fava') {
          extension.favaManager.onDidCloseTerminal();
        }
      }),
  );

  context.subscriptions.push(
      vscode.languages.registerCompletionItemProvider(
          {scheme: 'file', language: 'beancount'},
          extension.completer,
          '2',
          '#',
          '^',
          '"',
      ),
  );
  context.subscriptions.push(
      vscode.languages.registerHoverProvider(
          {scheme: 'file', language: 'beancount'},
          extension.completer,
      ),
  );
  context.subscriptions.push(
      vscode.languages.registerCodeActionsProvider(
          {scheme: 'file', language: 'beancount'},
          extension.actionProvider,
      ),
  );
  context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument(
          (e: vscode.TextDocumentChangeEvent) =>
            extension.formatter.instantFormat(e),
      ),
  );
  context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument((e: vscode.TextDocument) =>
        extension.refreshData(context),
      ),
  );

  context.subscriptions.push(
      vscode.workspace.onDidCloseTextDocument((e: vscode.TextDocument) =>
        extension.textDocumentClosed(e)),
  );

  context.subscriptions.push(
      vscode.workspace.onDidOpenTextDocument((e: vscode.TextDocument) =>
        extension.textDocumentOpened(e, context)),
  );

  context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(
          (e: vscode.ConfigurationChangeEvent) =>
            extension.configurationUpdated(e, context),
      ),
  );

  extension.refreshData(context);
  if (vscode.workspace.getConfiguration('beancount')['runFavaOnActivate']) {
    extension.favaManager.openFava(false);
  }
}

export function deactivate() { }

export class Extension {
  completer: Completer;
  actionProvider: ActionProvider;
  favaManager: FavaManager;
  diagnosticCollection: vscode.DiagnosticCollection;
  formatter: Formatter;
  logger: vscode.OutputChannel;
  flagWarnings: FlagWarnings;
  context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.completer = new Completer(this);
    this.actionProvider = new ActionProvider();
    this.favaManager = new FavaManager(this);
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection(
        'Beancount',
    );
    this.formatter = new Formatter();
    this.logger = vscode.window.createOutputChannel('Beancount');
    this.flagWarnings = vscode.workspace.getConfiguration('beancount')[
        'flagWarnings'
    ];
  }

  getMainBeanFile(): string {
    this.logger.append('try finding a valid bean file...');
    const mainBeanFile = vscode.workspace
        .getConfiguration('beancount')
        .get('mainBeanFile');
    if (mainBeanFile === undefined || mainBeanFile === '') {
      this.logger.append(
          'user did not specify a main bean file in settings...',
      );
      if (
        vscode.window.activeTextEditor !== undefined &&
        vscode.window.activeTextEditor.document.languageId === 'beancount'
      ) {
        this.logger.appendLine('use the bean file in current editor.');
        return vscode.window.activeTextEditor.document.fileName;
      } else {
        this.logger.appendLine('');
        return '';
      }
    } else {
      if (isAbsolute(String(mainBeanFile))) {
        this.logger.appendLine(
            'user specified a main bean file with an absolute path.',
        );
        return String(mainBeanFile);
      } else {
        this.logger.append(
            'user specified a main bean file with a relative path...',
        );
        if (vscode.workspace.workspaceFolders) {
          this.logger.appendLine('');
          return join(
              vscode.workspace.workspaceFolders[0].uri.fsPath,
              String(mainBeanFile),
          );
        } else {
          this.logger.appendLine('but there are no workspace folders.');
          return '';
        }
      }
    }
  }

  refreshData(context: vscode.ExtensionContext, mainFile?: string) {
    const mainBeanFile = mainFile ?? this.getMainBeanFile();
    const checkpy = context.asAbsolutePath('/pythonFiles/beancheck.py');
    const python3Path = vscode.workspace.getConfiguration('beancount')[
        'python3Path'
    ];
    if (mainBeanFile.length === 0 || !existsSync(mainBeanFile)) {
      this.logger.appendLine('find no valid bean files.');
      return;
    }
    const pyArgs = [checkpy, mainBeanFile];
    if (
      vscode.workspace.getConfiguration('beancount')['completePayeeNarration']
    ) {
      pyArgs.push('--payeeNarration');
    }
    this.logger.appendLine(
        `running ${python3Path} ${pyArgs} to refresh data...`,
    );
    runCmd(
        python3Path,
        pyArgs,
        (text: string) => {
          const errorsCompletions = text.split('\n', 3);
          this.provideDiagnostics(errorsCompletions[0], errorsCompletions[2]);
          this.completer.updateData(errorsCompletions[1]);
          this.logger.appendLine('Data refreshed.');
        },
        (str) => this.logger.append(str),
    );
  }

  textDocumentOpened(
      e: vscode.TextDocument,
      context: vscode.ExtensionContext,
  ) {
    if (e.languageId !== 'beancount') {
      return;
    }
    const mainBeanFile = vscode.workspace
        .getConfiguration('beancount')
        .get('mainBeanFile');
    if (mainBeanFile === undefined || mainBeanFile === '') {
      this.refreshData(context, e.fileName);
    }
  }

  textDocumentClosed(e: vscode.TextDocument) {
    if (e.languageId !== 'beancount') {
      return;
    }
    const mainBeanFile = vscode.workspace
        .getConfiguration('beancount')
        .get('mainBeanFile');
    if (mainBeanFile === undefined || mainBeanFile === '') {
      this.diagnosticCollection.set(e.uri, undefined);
    }
  }

  provideDiagnostics(errorsJson: string, flagsJson: string) {
    const errors: BeancountError[] = JSON.parse(errorsJson);
    const flags: BeancountFlag[] = JSON.parse(flagsJson);
    const diagsCollection: { [key: string]: vscode.Diagnostic[] } = {};
    errors.forEach((e) => {
      const range = new vscode.Range(
          new vscode.Position(Math.max(e.line - 1, 0), 0),
          new vscode.Position(Math.max(e.line, 1), 0),
      );
      const diag = new vscode.Diagnostic(
          range,
          e.message,
          vscode.DiagnosticSeverity.Error,
      );
      diag.source = 'Beancount';
      diag.code = DIAGNOSTIC_CODES.error;
      if (diagsCollection[e.file] === undefined) {
        diagsCollection[e.file] = [];
      }
      diagsCollection[e.file].push(diag);
    });
    flags.forEach((f) => {
      const warningType = this.flagWarnings[f.flag];
      if (warningType === null || warningType === undefined) {
        return;
      }
      const range = new vscode.Range(
          new vscode.Position(Math.max(f.line - 1, 0), 0),
          new vscode.Position(Math.max(f.line, 1), 0),
      );
      const diag = new FlagDiagnostic(f.flag, range, f.message, warningType);
      diag.source = 'Beancount';
      if (diagsCollection[f.file] === undefined) {
        diagsCollection[f.file] = [];
      }
      diagsCollection[f.file].push(diag);
    });
    this.diagnosticCollection.clear();
    const mainBeanFile = this.getMainBeanFile();
    for (const file of Object.keys(diagsCollection)) {
      this.diagnosticCollection.set(
          vscode.Uri.file(existsSync(file) ? file : mainBeanFile),
          diagsCollection[file],
      );
    }
  }

  configurationUpdated(
      e: vscode.ConfigurationChangeEvent,
      context: vscode.ExtensionContext,
  ) {
    if (e.affectsConfiguration('beancount.flagWarnings')) {
      this.flagWarnings = vscode.workspace.getConfiguration('beancount')[
          'flagWarnings'
      ];
    }
    if (
      e.affectsConfiguration('beancount.flagWarnings') ||
      e.affectsConfiguration('beancount.python3Path') ||
      e.affectsConfiguration('beancount.mainBeanFile')
    ) {
      this.refreshData(context);
    }
  }
}

export class FlagDiagnostic extends vscode.Diagnostic {
  readonly code: number = DIAGNOSTIC_CODES.flag;
  flag: string;

  constructor(
      flag: string,
      range: vscode.Range,
      message: string,
      severity?: vscode.DiagnosticSeverity,
  ) {
    super(range, message, severity);
    this.flag = flag;
  }
}

const DIAGNOSTIC_CODES = {
  error: 1,
  flag: 2,
};

interface BeancountError {
  file: string;
  line: number;
  message: string;
}

interface BeancountFlag {
  file: string;
  line: number;
  message: string;
  flag: string;
}

interface FlagWarnings {
  [index: string]: vscode.DiagnosticSeverity | null | undefined;
  '*': vscode.DiagnosticSeverity | null;
  '!': vscode.DiagnosticSeverity | null;
  P: vscode.DiagnosticSeverity | null;
  S: vscode.DiagnosticSeverity | null;
  T: vscode.DiagnosticSeverity | null;
  C: vscode.DiagnosticSeverity | null;
  U: vscode.DiagnosticSeverity | null;
  R: vscode.DiagnosticSeverity | null;
  M: vscode.DiagnosticSeverity | null;
}
