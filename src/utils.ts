import { spawn, SpawnOptions } from 'child_process';

export function run_cmd(
  cmd: string,
  args: string[],
  callBack: (stdout: string) => void,
  options?: SpawnOptions,
  logger?: (str: string) => void
) {
  const child = spawn(cmd, args);
  if (logger) {
    child.on('error', e => logger('error: ' + e));
    child.stderr.on('data', e => logger('stderr: ' + e));
  }
  let resp = '';
  child.stdout.on('data', buffer => {
    resp += buffer.toString();
  });
  child.stdout.on('end', () => {
    callBack(resp);
  });
}

export function countOccurrences(s: string, c: RegExp) {
  return (s.match(c) || []).length;
}
