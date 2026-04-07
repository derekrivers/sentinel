import { beforeEach, describe, expect, it, vi } from 'vitest';

const runCommand = vi.fn();
const pathExists = vi.fn();
const readNvmrc = vi.fn();
const readFile = vi.fn();

vi.mock('../../../src/utils/process.js', () => ({ runCommand }));
vi.mock('../../../src/utils/fs.js', () => ({ pathExists }));
vi.mock('../../../src/checkers/git/checkRepos.js', () => ({ readNvmrc }));
vi.mock('node:fs/promises', () => ({ readFile }));

describe('system checks', () => {
  beforeEach(() => {
    vi.resetModules();
    runCommand.mockReset();
    pathExists.mockReset();
    readNvmrc.mockReset();
    readFile.mockReset();
  });

  it('reports disk ok', async () => {
    runCommand.mockResolvedValue({ stdout: 'Filesystem 1024-blocks Used Available Capacity Mounted on\n/dev/disk 100 10 90 10% /\n', stderr: '' });
    const { checkDisk } = await import('../../../src/checkers/system/checkSystem.js');
    await expect(checkDisk('/', 80)).resolves.toEqual({ path: '/', usedPercent: 10, status: 'ok' });
  });

  it('reports disk warn', async () => {
    runCommand.mockResolvedValue({ stdout: 'x\ny 100 85 15 85% /\n', stderr: '' });
    const { checkDisk } = await import('../../../src/checkers/system/checkSystem.js');
    await expect(checkDisk('/', 80)).resolves.toEqual({ path: '/', usedPercent: 85, status: 'warn' });
  });

  it('reports disk error', async () => {
    runCommand.mockResolvedValue({ stdout: 'x\ny 100 96 4 96% /\n', stderr: '' });
    const { checkDisk } = await import('../../../src/checkers/system/checkSystem.js');
    await expect(checkDisk('/', 80)).resolves.toEqual({ path: '/', usedPercent: 96, status: 'error' });
  });

  it('reports node version match', async () => {
    runCommand.mockResolvedValue({ stdout: 'v22.0.0\n', stderr: '' });
    readNvmrc.mockResolvedValue('v22.0.0');
    const { checkNodeVersions } = await import('../../../src/checkers/system/checkSystem.js');
    await expect(checkNodeVersions(['/repo'])).resolves.toEqual([{ repo: '/repo', expected: 'v22.0.0', actual: 'v22.0.0', match: true }]);
  });

  it('reports node version mismatch', async () => {
    runCommand.mockResolvedValue({ stdout: 'v22.0.0\n', stderr: '' });
    readNvmrc.mockResolvedValue('v20.0.0');
    const { checkNodeVersions } = await import('../../../src/checkers/system/checkSystem.js');
    const [result] = await checkNodeVersions(['/repo']);
    expect(result.match).toBe(false);
  });

  it('skips missing nvmrc', async () => {
    runCommand.mockResolvedValue({ stdout: 'v22.0.0\n', stderr: '' });
    readNvmrc.mockResolvedValue(null);
    const { checkNodeVersions } = await import('../../../src/checkers/system/checkSystem.js');
    await expect(checkNodeVersions(['/repo'])).resolves.toEqual([]);
  });

  it('reports pnpm version match', async () => {
    runCommand.mockResolvedValue({ stdout: '9.0.0\n', stderr: '' });
    pathExists.mockResolvedValue(true);
    readFile.mockResolvedValue(JSON.stringify({ packageManager: 'pnpm@9.0.0' }));
    const { checkPnpmVersions } = await import('../../../src/checkers/system/checkSystem.js');
    await expect(checkPnpmVersions(['/repo'])).resolves.toEqual([{ repo: '/repo', expected: '9.0.0', actual: '9.0.0', match: true }]);
  });

  it('reports pnpm version mismatch', async () => {
    runCommand.mockResolvedValue({ stdout: '9.0.0\n', stderr: '' });
    pathExists.mockResolvedValue(true);
    readFile.mockResolvedValue(JSON.stringify({ packageManager: 'pnpm@8.0.0' }));
    const { checkPnpmVersions } = await import('../../../src/checkers/system/checkSystem.js');
    const [result] = await checkPnpmVersions(['/repo']);
    expect(result.match).toBe(false);
  });

  it('skips missing packageManager', async () => {
    runCommand.mockResolvedValue({ stdout: '9.0.0\n', stderr: '' });
    pathExists.mockResolvedValue(true);
    readFile.mockResolvedValue(JSON.stringify({ name: 'repo' }));
    const { checkPnpmVersions } = await import('../../../src/checkers/system/checkSystem.js');
    await expect(checkPnpmVersions(['/repo'])).resolves.toEqual([]);
  });
});
