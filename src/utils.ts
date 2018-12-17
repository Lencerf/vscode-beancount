import { spawn } from 'child_process';

export function run_cmd(cmd:string, args:Array<string>, callBack: (stdout: string) => void) {
    var child = spawn(cmd, args);
    var resp = "";
    child.stdout.on('data', function (buffer) { resp += buffer.toString() });
    child.stdout.on('end', function() { callBack (resp) });
}