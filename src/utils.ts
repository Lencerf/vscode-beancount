import { spawn, SpawnOptionsWithoutStdio } from "child_process";

export function runCmd(
  cmd: string,
  args: string[],
  callBack: (stdout: string) => void,
  options?: SpawnOptionsWithoutStdio,
  logger?: (str: string) => void
) {
  const child = spawn(cmd, args, options);
  if (logger) {
    child.on("error", (e) => logger("error: " + e));
    child.stderr.on("data", (e) => logger("stderr: " + e));
  }
  let resp = "";
  child.stdout.on("data", (buffer) => {
    resp += buffer.toString();
  });
  child.stdout.on("end", () => {
    callBack(resp);
  });
}

export function countOccurrences(s: string, c: RegExp) {
  return (s.match(c) || []).length;
}

export function pushIfEmpty<T>(array: T[], defaultValue: T): T[] {
  if (array.length === 0) {
    array.push(defaultValue);
  }
  return array;
}
