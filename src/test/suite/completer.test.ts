import * as assert from "assert";
import * as vscode from "vscode";
import { Completer } from "../../completer";
import { Extension } from "../../extension";

suite("Payee and narration completion", () => {
  const setting = "completeNarrationAsFirstString";
  const payee = "Grocery Store";
  const narration = "Weekly shopping";

  const setSetting = (value: boolean | undefined) =>
    vscode.workspace
      .getConfiguration("beancount")
      .update(setting, value, vscode.ConfigurationTarget.Global);

  // Labels offered after typing a `"` at the end of `line`.
  async function complete(line: string): Promise<Set<string>> {
    const completer = new Completer({} as Extension);
    completer.payees = [payee];
    completer.narrations = [narration];
    const document = await vscode.workspace.openTextDocument({ content: line });
    const result = await completer.provideCompletionItems(
      document,
      new vscode.Position(0, line.length),
      new vscode.CancellationTokenSource().token,
      {
        triggerKind: vscode.CompletionTriggerKind.TriggerCharacter,
        triggerCharacter: '"',
      }
    );
    const items = Array.isArray(result) ? result : result.items;
    return new Set(
      items.map((item) =>
        typeof item.label === "string" ? item.label : item.label.label
      )
    );
  }

  teardown(() => setSetting(undefined));

  test("first string offers payees and narrations by default", async () => {
    assert.deepStrictEqual(
      await complete('2024-01-31 * "'),
      new Set([payee, narration])
    );
  });

  test("first string offers only payees when the setting is off", async () => {
    await setSetting(false);
    assert.deepStrictEqual(await complete('2024-01-31 * "'), new Set([payee]));
  });

  test("second string offers narrations when the setting is off", async () => {
    await setSetting(false);
    assert.deepStrictEqual(
      await complete(`2024-01-31 * "${payee}" "`),
      new Set([narration])
    );
  });
});
