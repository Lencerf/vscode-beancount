// Runs inside the VS Code extension host; see runPerf.ts.
import * as cp from "child_process";
import * as inspector from "inspector";
import { monitorEventLoopDelay, performance } from "perf_hooks";
import * as vscode from "vscode";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(condition: () => boolean, timeoutMs: number) {
  const start = performance.now();
  while (!condition()) {
    if (performance.now() - start > timeoutMs) {
      return false;
    }
    await sleep(5);
  }
  return true;
}

function summarize(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  const at = (q: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  const round = (n: number) => Math.round(n * 10) / 10;
  return {
    n: sorted.length,
    mean: round(sorted.reduce((a, b) => a + b, 0) / sorted.length),
    p50: round(at(0.5)),
    p95: round(at(0.95)),
    max: round(sorted[sorted.length - 1]),
  };
}

/** Sends one key and returns the time until `done` fires. */
async function timeKey(
  send: () => Thenable<unknown>,
  done: (listener: () => void) => vscode.Disposable
): Promise<number> {
  const start = performance.now();
  const fired = new Promise<void>((resolve) => {
    const subscription = done(() => {
      subscription.dispose();
      resolve();
    });
  });
  void send();
  const timeout = sleep(30000).then(() => "timeout");
  const result = await Promise.race([fired, timeout]);
  if (result === "timeout") {
    throw new Error("a key press was not handled within 30 s");
  }
  return performance.now() - start;
}

interface ProfileNode {
  id: number;
  callFrame: { functionName: string; url: string; lineNumber: number };
  hitCount?: number;
}

/** Self time per owner and the top functions, from a CPU profile. */
function summarizeProfile(profile: inspector.Profiler.Profile) {
  const nodes = profile.nodes as ProfileNode[];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const deltas = profile.timeDeltas ?? [];
  const samples = profile.samples ?? [];
  const selfMs = new Map<number, number>();
  samples.forEach((id, index) => {
    selfMs.set(id, (selfMs.get(id) ?? 0) + (deltas[index] ?? 0) / 1000);
  });
  const owner = (node: ProfileNode) => {
    const url = node.callFrame.url;
    const name = node.callFrame.functionName;
    if (name === "(idle)") {
      return "idle";
    }
    if (name === "(garbage collector)") {
      return "gc";
    }
    if (/vscodevim/i.test(url)) {
      return "vim";
    }
    if (/dist[\\/]extension\.js/.test(url)) {
      return "beancount";
    }
    if (/out[\\/]test/.test(url)) {
      return "test";
    }
    return "vscode+node";
  };
  const owners: { [name: string]: number } = {};
  const functions: { [name: string]: number } = {};
  for (const [id, ms] of selfMs) {
    const node = byId.get(id);
    if (!node) {
      continue;
    }
    const who = owner(node);
    owners[who] = Math.round((owners[who] ?? 0) + ms);
    if (who !== "idle") {
      const file = node.callFrame.url.split(/[\\/]/).slice(-2).join("/");
      const key = `${who}: ${node.callFrame.functionName || "(anonymous)"} ${file}:${node.callFrame.lineNumber + 1}`;
      functions[key] = (functions[key] ?? 0) + ms;
    }
  }
  const top = Object.entries(functions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name, ms]) => `${Math.round(ms)}ms ${name}`);
  return { owners, top };
}

function post<T>(
  session: inspector.Session,
  method: string
): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    session.post(method, (err: Error | null, result?: object) =>
      err ? reject(err) : resolve(result as T | undefined)
    );
  });
}

export async function run(): Promise<void> {
  const file = process.env.PERF_FILE as string;
  const scenario = process.env.PERF_SCENARIO as string;
  const vim = process.env.PERF_VIM === "1";
  const result: { [key: string]: unknown } = { scenario };

  // Events that make the extension reload its data or redraw its hints.
  const started = performance.now();
  const counts = { visibleEditors: 0, opened: 0, saved: 0, diagnostics: 0 };
  const openedDocuments: string[] = [];
  vscode.window.onDidChangeVisibleTextEditors(() => counts.visibleEditors++);
  vscode.workspace.onDidOpenTextDocument((d) => {
    counts.opened++;
    openedDocuments.push(`${d.uri.scheme}:${d.languageId}`);
  });
  vscode.workspace.onDidSaveTextDocument(() => counts.saved++);
  // Timeline (seconds since start) of diagnostics changes and of how many
  // beancheck.py processes are running.
  const t0 = performance.now();
  const at = () => Math.round((performance.now() - t0) / 100) / 10;
  const timeline: string[] = [];
  vscode.languages.onDidChangeDiagnostics((e) => {
    counts.diagnostics++;
    timeline.push(`${at()}s diagnostics(${e.uris.length})`);
  });
  vscode.window.onDidChangeVisibleTextEditors((editors) =>
    timeline.push(`${at()}s visibleEditors(${editors.length})`)
  );
  let running = -1;
  const sampler = setInterval(() => {
    cp.exec("pgrep -f '[b]eancheck.py' | wc -l", (_err, stdout) => {
      const n = Number(stdout.trim());
      if (n !== running) {
        running = n;
        timeline.push(`${at()}s python=${n}`);
      }
    });
  }, 200);
  const phases: { [phase: string]: string } = {};
  const phaseTimes: string[] = [];
  const mark = (phase: string) => {
    phases[phase] = JSON.stringify(counts);
    phaseTimes.push(`${phase}@${Math.round((performance.now() - started) / 100) / 10}s`);
  };

  const startupSession = new inspector.Session();
  startupSession.connect();
  await post(startupSession, "Profiler.enable");
  await post(startupSession, "Profiler.start");
  const startupLoop = monitorEventLoopDelay({ resolution: 5 });
  startupLoop.enable();

  const opened = performance.now();
  const document = await vscode.workspace.openTextDocument(
    vscode.Uri.file(file)
  );
  const editor = await vscode.window.showTextDocument(document);

  // Watch the renderer while the extension loads its data for the first time.
  let starting = true;
  const startup = { worstRoundTripMs: 0, blockedMs: 0, slow: [] as string[] };
  const startupWatch = (async () => {
    while (starting) {
      const start = performance.now();
      await vscode.commands.executeCommand("setContext", "beancountPerf", 0);
      const ping = performance.now() - start;
      startup.worstRoundTripMs = Math.max(startup.worstRoundTripMs, ping);
      if (ping > 100) {
        startup.blockedMs += ping;
        startup.slow.push(
          `${Math.round((start - opened) / 100) / 10}s:${Math.round(ping)}ms`
        );
      }
      await sleep(50);
    }
  })();
  result.language = document.languageId;
  result.windowFocused = vscode.window.state.focused;
  if (vim) {
    const vimExtension = vscode.extensions.getExtension("vscodevim.vim");
    result.vimActive = await waitFor(
      () => vimExtension?.isActive === true,
      60000
    );
    result.vimActiveMs = Math.round(performance.now() - opened);
  }
  if (document.languageId === "beancount") {
    // The generated ledger has flagged transactions, so diagnostics appear
    // once the extension has processed the output of beancheck.py.
    const ready = await waitFor(
      () => vscode.languages.getDiagnostics(document.uri).length > 0,
      180000
    );
    result.dataReadyMs = ready ? Math.round(performance.now() - opened) : -1;
    result.diagnostics = vscode.languages.getDiagnostics(document.uri).length;
  }
  await sleep(10000);
  starting = false;
  await startupWatch;
  startupLoop.disable();
  result.startupLoopDelayMs = {
    p99: Math.round(startupLoop.percentile(99) / 1e6),
    max: Math.round(startupLoop.max / 1e6),
  };
  const startupProfile = await post<{ profile: inspector.Profiler.Profile }>(
    startupSession,
    "Profiler.stop"
  );
  if (startupProfile) {
    result.startupCpu = summarizeProfile(startupProfile.profile);
  }
  startupSession.disconnect();
  startup.worstRoundTripMs = Math.round(startup.worstRoundTripMs);
  startup.blockedMs = Math.round(startup.blockedMs);
  startup.slow = startup.slow.slice(0, 12);
  result.startup = startup;
  mark("ready");

  const lineIsPosting = (line: number) =>
    document.lineAt(line).text === "  Assets:Bank:Checking";
  let startLine = Math.floor(document.lineCount / 2);
  while (!lineIsPosting(startLine)) {
    startLine++;
  }
  const position = new vscode.Position(startLine, 0);
  editor.selection = new vscode.Selection(position, position);
  editor.revealRange(new vscode.Range(position, position));
  await sleep(2000);

  // Round trip to the renderer while nothing else happens.
  const pings: number[] = [];
  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    await vscode.commands.executeCommand("setContext", "beancountPerf", i);
    pings.push(performance.now() - start);
  }
  result.idleRoundTripMs = summarize(pings);

  const session = new inspector.Session();
  session.connect();
  await post(session, "Profiler.enable");
  await post(session, "Profiler.start");
  const loopDelay = monitorEventLoopDelay({ resolution: 5 });
  loopDelay.enable();

  // Move the cursor down, one key at a time.
  const selectionChanged = (listener: () => void) =>
    vscode.window.onDidChangeTextEditorSelection((e) => {
      if (e.textEditor === editor) {
        listener();
      }
    });
  const moves: number[] = [];
  for (let i = 0; i < 60; i++) {
    moves.push(
      await timeKey(
        () =>
          vim
            ? vscode.commands.executeCommand("type", { text: "j" })
            : vscode.commands.executeCommand("cursorDown"),
        selectionChanged
      )
    );
  }
  result.moveMs = summarize(moves);
  mark("moved");

  // Type a posting on a new line, one character at a time.
  editor.selection = new vscode.Selection(position, position);
  await sleep(1000);
  const documentChanged = (listener: () => void) =>
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document === document && e.contentChanges.length > 0) {
        listener();
      }
    });
  await timeKey(
    () =>
      vim
        ? vscode.commands.executeCommand("type", { text: "o" })
        : vscode.commands.executeCommand("editor.action.insertLineAfter"),
    documentChanged
  );
  await sleep(500);
  const typed: number[] = [];
  for (const text of "Expenses:Cat1 12.34 USD") {
    typed.push(
      await timeKey(
        () => vscode.commands.executeCommand("type", { text }),
        documentChanged
      )
    );
    await sleep(30);
  }
  result.typeMs = summarize(typed);
  mark("typed");
  result.typedLine = document.lineAt(editor.selection.active.line).text;

  loopDelay.disable();
  result.extensionHostLoopDelayMs = {
    mean: Math.round(loopDelay.mean / 1e5) / 10,
    p99: Math.round(loopDelay.percentile(99) / 1e5) / 10,
    max: Math.round(loopDelay.max / 1e5) / 10,
  };
  const stopped = await post<{ profile: inspector.Profiler.Profile }>(
    session,
    "Profiler.stop"
  );
  if (stopped) {
    result.extensionHostCpu = summarizeProfile(stopped.profile);
  }
  session.disconnect();

  // Cost of single provider requests, as the editor would send them.
  const header = startLine - 1;
  const timeCommand = async (command: string, ...args: unknown[]) => {
    const times: number[] = [];
    let size = -1;
    for (let i = 0; i < 3; i++) {
      const start = performance.now();
      const value = await vscode.commands.executeCommand<unknown>(
        command,
        document.uri,
        ...args
      );
      times.push(performance.now() - start);
      if (Array.isArray(value)) {
        size = value.length;
      } else if (value && typeof value === "object" && "items" in value) {
        size = (value as vscode.CompletionList).items.length;
      }
    }
    return { ms: times.map((t) => Math.round(t)), size };
  };
  result.providers = {
    headerLine: document.lineAt(header).text.slice(0, 20),
    completionOnPosting: await timeCommand(
      "vscode.executeCompletionItemProvider",
      new vscode.Position(editor.selection.active.line, 3)
    ),
    codeActionsOnHeader: await timeCommand(
      "vscode.executeCodeActionProvider",
      new vscode.Range(header, 0, header, 4)
    ),
    symbols: await timeCommand("vscode.executeDocumentSymbolProvider"),
    links: await timeCommand("vscode.executeLinkProvider"),
  };

  // Save the document, which makes the extension reload its data, and watch
  // how long the renderer and key presses take to respond afterwards.
  const saveStart = performance.now();
  await document.save();
  // Optionally keep editing and saving, as someone who saves often would.
  const extraSaves = Number(process.env.PERF_SAVES ?? "0");
  for (let i = 0; i < extraSaves; i++) {
    await sleep(700);
    await editor.edit((builder) =>
      builder.insert(new vscode.Position(0, 0), `; edit ${i}\n`)
    );
    await document.save();
  }
  timeline.push(`${at()}s savesDone`);
  const slow: string[] = [];
  let worstPing = 0;
  let blockedMs = 0;
  const keyTimes: number[] = [];
  let lastKey = 0;
  while (performance.now() - saveStart < 50000) {
    const start = performance.now();
    await vscode.commands.executeCommand("setContext", "beancountPerf", start);
    const ping = performance.now() - start;
    worstPing = Math.max(worstPing, ping);
    if (ping > 100) {
      blockedMs += ping;
      slow.push(
        `${Math.round((start - saveStart) / 100) / 10}s:${Math.round(ping)}ms`
      );
    }
    if (performance.now() - lastKey > 500) {
      lastKey = performance.now();
      keyTimes.push(
        await timeKey(
          () =>
            vim
              ? vscode.commands.executeCommand("type", { text: "j" })
              : vscode.commands.executeCommand("cursorDown"),
          selectionChanged
        )
      );
    }
    await sleep(50);
  }
  result.afterSave = {
    worstRoundTripMs: Math.round(worstPing),
    blockedMs: Math.round(blockedMs),
    slowRoundTrips: slow.slice(0, 12),
    moveMs: summarize(keyTimes),
  };

  mark("saved");
  result.events = phases;
  result.openedDocuments = openedDocuments.slice(0, 20);
  clearInterval(sampler);
  result.timeline = timeline;
  result.phaseTimes = phaseTimes;

  console.log("PERF_RESULT " + JSON.stringify(result));
}
