// Measures how long VS Code takes to handle key presses in a large ledger,
// with and without the Vim extension, and with and without this extension's
// features. Run with: xvfb-run -a node out/test/perf/runPerf.js
import * as cp from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  downloadAndUnzipVSCode,
  resolveCliArgsFromVSCodeExecutablePath,
  runTests,
} from "@vscode/test-electron";
import { generateLedger } from "./genLedger";

interface Scenario {
  name: string;
  file: string;
  vim: boolean;
  settings: { [key: string]: unknown };
  saves?: number;
}

async function main() {
  const extensionDevelopmentPath = path.resolve(__dirname, "../../../");
  const extensionTestsPath = path.resolve(__dirname, "./index");
  const transactions = Number(process.env.PERF_TXNS ?? "60000");

  const vscodeExecutablePath = await downloadAndUnzipVSCode();
  const [cli, ...cliArgs] =
    resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);
  cp.spawnSync(cli, [...cliArgs, "--install-extension", "vscodevim.vim"], {
    encoding: "utf-8",
    stdio: "inherit",
  });

  const work = fs.mkdtempSync(path.join(os.tmpdir(), "beancount-perf-"));
  const ledger = path.join(work, "ledger.beancount");
  const plain = path.join(work, "ledger.txt");
  const noOpens = path.join(work, "included.beancount");
  const lineCount = generateLedger(ledger, transactions);
  generateLedger(noOpens, transactions, false);
  const manyAccounts = path.join(work, "many-accounts.beancount");
  generateLedger(manyAccounts, transactions, true, 3000);
  fs.copyFileSync(ledger, plain);
  console.log(`PERF ledger: ${transactions} transactions, ${lineCount} lines`);

  const only = process.env.PERF_ONLY?.split(",");
  const noHints = { "beancount.inlayHints": false };
  const scenarios: Scenario[] = [
    { name: "error-saves/vim", file: noOpens, vim: true, settings: {}, saves: 8 },
    { name: "error-saves/no-vim", file: noOpens, vim: false, settings: {}, saves: 8 },
  ];

  for (const scenario of scenarios) {
    if (only && !only.includes(scenario.name)) {
      continue;
    }
    fs.mkdirSync(path.join(work, ".vscode"), { recursive: true });
    fs.writeFileSync(
      path.join(work, ".vscode", "settings.json"),
      JSON.stringify(scenario.settings)
    );
    console.log(`PERF start ${scenario.name}`);
    const marker = path.join(work, "marker");
    fs.writeFileSync(marker, "");
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        work,
        ...(scenario.vim ? [] : ["--disable-extension", "vscodevim.vim"]),
      ],
      extensionTestsEnv: {
        PERF_FILE: scenario.file,
        PERF_SCENARIO: scenario.name,
        PERF_VIM: scenario.vim ? "1" : "0",
        PERF_SAVES: String(scenario.saves ?? 0),
      },
    });
    // Print what the extension wrote to its output channel in this run.
    const logs = cp
      .execSync(
        `find ${extensionDevelopmentPath}/.vscode-test/user-data/logs -name '*Beancount.log' -newer ${marker}`,
        { encoding: "utf-8" }
      )
      .trim()
      .split("\n")
      .filter((f) => f.length > 0);
    for (const log of logs) {
      const text = fs.readFileSync(log, "utf-8").replace(/\/\S+\//g, "");
      console.log(`PERF_LOG ${scenario.name}: ${JSON.stringify(text)}`);
    }
  }
}

main().catch((err) => {
  console.error("Failed to run the measurements", err);
  process.exit(1);
});
