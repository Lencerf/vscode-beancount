import { spawn, SpawnOptions } from 'child_process';

export function run_cmd(cmd: string, args: Array<string>, callBack: (stdout: string) => void, options?: SpawnOptions, logger?: (str: string) => void) {
    var child = spawn(cmd, args, options);
    if (logger) {
        child.on('error', (e) => logger("error: " + e))
        child.stderr.on('data', (e) => logger("stderr: " + e));
    }
    var resp = "";
    child.stdout.on('data', function (buffer) { resp += buffer.toString() });
    child.stdout.on('end', function() { callBack (resp) });
}