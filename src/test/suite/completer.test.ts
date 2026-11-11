import * as assert from "assert";
import * as path from "path";
import * as vscode from "vscode";
import { Completer } from "../../completer";
import { Extension } from "../../extension";

suite("Payee and narration completion", () => {
  const payee = "Grocery Store";
  const narration = "Weekly shopping";

  const setSetting = (name: string, value: unknown) =>
    vscode.workspace
      .getConfiguration("beancount")
      .update(name, value, vscode.ConfigurationTarget.Global);

  // Sorted labels offered after typing a `"` at the end of `line`.
  async function complete(
    line: string,
    payees = [payee],
    narrations = [narration]
  ): Promise<string[]> {
    // The completer only uses the extension to locate input method data.
    const root = path.resolve(__dirname, "../../..");
    const completer = new Completer({
      context: { asAbsolutePath: (p: string) => path.join(root, p) },
    } as unknown as Extension);
    completer.payees = payees;
    completer.narrations = narrations;
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
    return items
      .map((item) =>
        typeof item.label === "string" ? item.label : item.label.label
      )
      .sort();
  }

  teardown(async () => {
    await setSetting("completeNarrationAsFirstString", undefined);
    await setSetting("inputMethods", undefined);
  });

  test("first string offers each payee and narration once by default", async () => {
    assert.deepStrictEqual(await complete('2024-01-31 * "'), [
      payee,
      narration,
    ]);
  });

  test("first string offers only payees when the setting is off", async () => {
    await setSetting("completeNarrationAsFirstString", false);
    assert.deepStrictEqual(await complete('2024-01-31 * "'), [payee]);
  });

  test("second string offers narrations when the setting is off", async () => {
    await setSetting("completeNarrationAsFirstString", false);
    assert.deepStrictEqual(await complete(`2024-01-31 * "${payee}" "`), [
      narration,
    ]);
  });

  test("with Pinyin, each suggestion is offered once", async () => {
    await setSetting("inputMethods", ["pinyin"]);
    // "—" has no letter representation, so it is offered under its own text.
    assert.deepStrictEqual(await complete('2024-01-31 * "', ["超市", "—"], []), [
      "cs(超市)",
      "—",
    ]);
  });
});
