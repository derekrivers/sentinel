import { beforeEach, describe, expect, it, vi } from 'vitest';

const pathExists = vi.fn();
const runGit = vi.fn();
class GitProcessError extends Error {
  constructor(args: string[], cwd: string, stderr: string) {
    super(stderr || `git ${args.join(' ')} failed in ${cwd}`);
    this.name = 'GitProcessError';
  }
}
vi.mock('../../../src/utils/fs.js', () => ({ pathExists }));
vi.mock('../../../src/checkers/git/gitProcess.js', () => ({ runGit, GitProcessError }));

describe('checkRepos', () => {
  beforeEach(() => {
    vi.resetModules();
    pathExists.mockReset();
    runGit.mockReset();
  });

  it('returns ok for a clean repo', async () => {
    pathExists.mockResolvedValue(true);
    runGit.mockResolvedValueOnce('true').mockResolvedValueOnce('').mockResolvedValueOnce('0 0').mockResolvedValueOnce('main|4102444800|origin/main');
    const { checkRepos } = await import('../../../src/checkers/git/checkRepos.js');
    await expect(checkRepos(['/repo'], 30)).resolves.toEqual([{ repo: '/repo', status: 'ok', warnings: [] }]);
  });

  it('warns for a dirty tree', async () => {
    pathExists.mockResolvedValue(true);
    runGit.mockResolvedValueOnce('true').mockResolvedValueOnce(' M file.ts').mockResolvedValueOnce('0 0').mockResolvedValueOnce('main|4102444800|origin/main');
    const { checkRepos } = await import('../../../src/checkers/git/checkRepos.js');
    const [result] = await checkRepos(['/repo'], 30);
    expect(result.status).toBe('warn');
    expect(result.warnings[0]).toContain('uncommitted changes');
  });

  it('warns when branch is behind remote', async () => {
    pathExists.mockResolvedValue(true);
    runGit.mockResolvedValueOnce('true').mockResolvedValueOnce('').mockResolvedValueOnce('0 2').mockResolvedValueOnce('main|4102444800|origin/main');
    const { checkRepos } = await import('../../../src/checkers/git/checkRepos.js');
    const [result] = await checkRepos(['/repo'], 30);
    expect(result.warnings).toContain('Current branch is behind remote by 2 commit(s).');
  });

  it('warns for stale unpushed branches', async () => {
    pathExists.mockResolvedValue(true);
    runGit.mockResolvedValueOnce('true').mockResolvedValueOnce('').mockResolvedValueOnce('0 0').mockResolvedValueOnce('feature|0|');
    const { checkRepos } = await import('../../../src/checkers/git/checkRepos.js');
    const [result] = await checkRepos(['/repo'], 1);
    expect(result.warnings[0]).toContain('stale');
  });

  it('errors for a missing repo path', async () => {
    pathExists.mockResolvedValue(false);
    const { checkRepos } = await import('../../../src/checkers/git/checkRepos.js');
    await expect(checkRepos(['/missing'], 30)).resolves.toEqual([{ repo: '/missing', status: 'error', warnings: ['Repository path does not exist.'] }]);
  });

  it('errors for a non-git directory', async () => {
    pathExists.mockResolvedValue(true);
    runGit.mockRejectedValue(new Error('fatal: not a git repository'));
    const { checkRepos } = await import('../../../src/checkers/git/checkRepos.js');
    await expect(checkRepos(['/dir'], 30)).resolves.toEqual([{ repo: '/dir', status: 'error', warnings: ['Path exists but is not a git repository.'] }]);
  });

  it('includes git stderr when a command fails', async () => {
    pathExists.mockResolvedValue(true);
    runGit.mockResolvedValueOnce('true').mockRejectedValueOnce(new Error('fatal: upstream missing'));
    const { checkRepos } = await import('../../../src/checkers/git/checkRepos.js');
    const [result] = await checkRepos(['/repo'], 30);
    expect(result.status).toBe('error');
    expect(result.warnings[0]).toContain('fatal: upstream missing');
  });

  it('continues checking other repos when one git command fails', async () => {
    pathExists.mockResolvedValue(true);
    runGit.mockImplementation(async (args: string[], cwd: string) => {
      if (cwd === '/broken') {
        if (args[0] === 'rev-parse') return 'true';
        if (args[0] === 'status') throw new Error('fatal: upstream missing');
      }

      if (cwd === '/healthy') {
        if (args[0] === 'rev-parse') return 'true';
        if (args[0] === 'status') return '';
        if (args[0] === 'rev-list') return '0 0';
        if (args[0] === 'for-each-ref') return 'main|4102444800|origin/main';
      }

      throw new Error(`Unexpected git call: ${cwd} ${args.join(' ')}`);
    });
    const { checkRepos } = await import('../../../src/checkers/git/checkRepos.js');
    await expect(checkRepos(['/broken', '/healthy'], 30)).resolves.toEqual([
      { repo: '/broken', status: 'error', warnings: ['fatal: upstream missing'] },
      { repo: '/healthy', status: 'ok', warnings: [] }
    ]);
  });
});
