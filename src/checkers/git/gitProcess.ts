import { runCommand } from '../../utils/process.js';

export class GitProcessError extends Error {
  constructor(
    public readonly args: string[],
    public readonly cwd: string,
    public readonly stderr: string
  ) {
    super(stderr || `git ${args.join(' ')} failed in ${cwd}`);
    this.name = 'GitProcessError';
  }
}

export async function runGit(args: string[], cwd: string): Promise<string> {
  try {
    const result = await runCommand('git', args, cwd);
    return result.stdout.trim();
  } catch (error) {
    const stderr = error instanceof Error ? error.message.trim() : 'Unknown git error';
    throw new GitProcessError(args, cwd, stderr);
  }
}
