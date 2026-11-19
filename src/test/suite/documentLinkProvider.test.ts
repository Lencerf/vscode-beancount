import * as assert from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import DocumentLinkProvider from "../../documentLinkProvider";

suite("Include document links", () => {
  const provider = new DocumentLinkProvider();
  let root: string;

  suiteSetup(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "beancount-include-"));
  });

  suiteTeardown(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  function write(relative: string, text: string): string {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
    return file;
  }

  async function linksFor(file: string): Promise<vscode.DocumentLink[]> {
    const document = await vscode.workspace.openTextDocument(
      vscode.Uri.file(file)
    );
    return provider.provideDocumentLinks(document);
  }

  test("resolves a relative include against the including file", async () => {
    write("transactions/2025/01.bean", "; leaf\n");
    const year = write("transactions/2025/year.bean", 'include "01.bean"\n');

    const links = await linksFor(year);

    assert.strictEqual(links.length, 1);
    assert.ok(links[0].target);
    assert.strictEqual(
      links[0].target.fsPath,
      vscode.Uri.file(path.join(root, "transactions/2025/01.bean")).fsPath
    );
  });

  test("keeps an absolute include path unchanged", async () => {
    const absolute = path
      .join(root, "shared", "accounts.bean")
      .split(path.sep)
      .join("/");
    const main = write("main.bean", `include "${absolute}"\n`);

    const links = await linksFor(main);

    assert.strictEqual(links.length, 1);
    assert.ok(links[0].target);
    assert.strictEqual(links[0].target.fsPath, vscode.Uri.file(absolute).fsPath);
  });
});