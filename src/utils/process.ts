import { execFile } from 'node:child_process';

export interface ProcessResult {
  stdout: string;
  stderr: string;
}

export async function runCommand(command: string, args: string[], cwd?: string): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(String(stderr || error.message).trim() || `Command failed: ${command}`));
        return;
      }
      resolve({ stdout: String(stdout), stderr: String(stderr) });
    });
  });
}
