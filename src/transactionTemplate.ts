// Pure helpers for completing whole transactions. Kept free of `vscode`
// imports so they can be unit tested without an extension host.

/** A previously written transaction, as reported by beancheck.py. */
export interface TransactionTemplate {
  payee: string;
  narration: string;
  /** ISO date of the most recent transaction with this payee and narration. */
  date: string;
  /** Header line text after the date and the flag, verbatim from the source. */
  header: string;
  /** Posting, metadata and comment lines, verbatim from the source. */
  body: string[];
}

export type SnippetSegment = { text: string } | { placeholder: string };

/**
 * Matches the header of a transaction being typed: a date, a flag and an
 * optional partially typed word (not starting with a quote, so it does not
 * interfere with payee/narration completion). Group 1 is the partial word.
 */
export const TRANSACTION_HEADER_PREFIX =
  /^\d{4}[-/]\d{1,2}[-/]\d{1,2}\s+(?:txn|[*!])\s+([^"\s]*)$/;

/**
 * A posting with a plain number amount: indentation, optional flag and the
 * account (group 1), the number (group 2) and the rest of the line (group 3).
 * Accounts always contain a colon, which distinguishes them from metadata
 * (`key: value`).
 */
const POSTING_WITH_NUMBER =
  /^(\s+(?:[!*]\s+)?[^\s;]+:[^\s;]+\s+)([-+]?(?:\d[\d,]*(?:\.\d*)?|\.\d+))(?=\s|$)(.*)$/;

/**
 * Splits a template into snippet segments. Every plain-number posting amount
 * becomes a placeholder so the user can tab through and adjust it; postings
 * with elided amounts and all other lines are kept verbatim.
 */
export function templateSegments(template: TransactionTemplate): SnippetSegment[] {
  const segments: SnippetSegment[] = [{ text: template.header }];
  for (const line of template.body) {
    const m = POSTING_WITH_NUMBER.exec(line);
    if (m) {
      segments.push({ text: "\n" + m[1] }, { placeholder: m[2] }, { text: m[3] });
    } else {
      segments.push({ text: "\n" + line });
    }
  }
  return segments;
}

/** Plain text of a template, for display. */
export function templateText(template: TransactionTemplate): string {
  return [template.header, ...template.body].join("\n");
}
