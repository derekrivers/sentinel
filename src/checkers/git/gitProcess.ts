import { runCommand } from '../../utils/process.js';

export async function runGit(args: string[], cwd: string): Promise<string> {
  const result = await runCommand('git', args, cwd);
  return result.stdout.trim();
}
