import * as fs from "fs";

/**
 * Writes a large synthetic ledger to `out`:
 * - every transaction leaves its last posting's amount out;
 * - one in four has three legs (beancheck.py reports an inlay hint for those);
 * - one in 500 is flagged with `!`;
 * - payees repeat once, narrations are unique.
 */
export function generateLedger(
  out: string,
  count: number,
  withOpens = true,
  categories = 200
): number {
  const lines = ['option "operating_currency" "USD"', ""];
  const accounts = ["Assets:Bank:Checking", "Assets:Cash", "Liabilities:Card"];
  for (let c = 0; c < categories; c++) {
    accounts.push(`Expenses:Cat${c}`);
  }
  // Without `open` directives every posting is an error, as when a file that
  // is included by a main file is loaded on its own.
  if (withOpens) {
    for (const account of accounts) {
      lines.push(`2005-01-01 open ${account}`);
    }
  }
  lines.push("");

  const start = Date.UTC(2005, 0, 2);
  const span = 20 * 365 * 24 * 3600 * 1000;
  for (let i = 0; i < count; i++) {
    const date = new Date(start + Math.floor((i / count) * span))
      .toISOString()
      .slice(0, 10);
    const flag = i % 500 === 499 ? "!" : "*";
    const payee = `Payee ${i % Math.ceil(count / 2)}`;
    lines.push(`${date} ${flag} "${payee}" "Narration number ${i}"`);
    const cents = String(i % 100).padStart(2, "0");
    lines.push(
      `  Expenses:Cat${i % categories}          ${10 + (i % 90)}.${cents} USD`
    );
    if (i % 4 === 0) {
      lines.push(`  Expenses:Cat${(i + 1) % categories}          2.50 USD`);
      lines.push("  Liabilities:Card");
    } else {
      lines.push("  Assets:Bank:Checking");
    }
    lines.push("");
  }
  fs.writeFileSync(out, lines.join("\n"));
  return lines.length;
}
