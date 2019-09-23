import { spawn, SpawnOptions } from 'child_process';

export function run_cmd(cmd: string, args: string[], callBack: (stdout: string) => void, options?: SpawnOptions, logger?: (str: string) => void) {
    const child = spawn(cmd, args, options);
    if (logger) {
        child.on('error', (e) => logger("error: " + e))
        child.stderr.on('data', (e) => logger("stderr: " + e));
    }
    let resp = "";
    child.stdout.on('data', (buffer) => { resp += buffer.toString() });
    child.stdout.on('end', () => { callBack (resp) });
}