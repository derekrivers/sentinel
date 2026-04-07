import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadConfig = vi.fn();
const checkRepos = vi.fn();
const checkServices = vi.fn();
const checkSystem = vi.fn();
const writeMarkdownReport = vi.fn();
const renderTerminal = vi.fn(() => 'rendered');

vi.mock('../../src/config/loadConfig.js', () => ({ loadConfig }));
vi.mock('../../src/checkers/git/checkRepos.js', () => ({ checkRepos }));
vi.mock('../../src/checkers/services/checkServices.js', () => ({ checkServices }));
vi.mock('../../src/checkers/system/checkSystem.js', () => ({ checkSystem }));
vi.mock('../../src/output/report.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/output/report.js')>('../../src/output/report.js');
  return { ...actual, writeMarkdownReport };
});
vi.mock('../../src/output/terminal.js', () => ({ renderTerminal }));

describe('runCheck', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    loadConfig.mockReset();
    checkRepos.mockReset();
    checkServices.mockReset();
    checkSystem.mockReset();
    writeMarkdownReport.mockReset();
    renderTerminal.mockClear();
    loadConfig.mockResolvedValue({ repos: ['/repo'], services: [{ name: 'db', host: 'localhost', port: 5432 }], diskPath: '/', thresholds: { diskWarningPercent: 80, branchStaleDays: 30 } });
    writeMarkdownReport.mockResolvedValue('/home/test/.sentinel/report-2026-04-07.md');
  });

  it('returns exit code 0 when everything is ok', async () => {
    checkRepos.mockResolvedValue([{ repo: '/repo', status: 'ok', warnings: [] }]);
    checkServices.mockResolvedValue([{ name: 'db', status: 'up', latencyMs: 10 }]);
    checkSystem.mockResolvedValue({ disk: { path: '/', usedPercent: 10, status: 'ok' }, nodeVersions: [], pnpmVersions: [], warnings: [] });
    const { runCheck } = await import('../../src/commands/check.js');
    await expect(runCheck()).resolves.toBe(0);
  });

  it('returns exit code 1 for warnings', async () => {
    checkRepos.mockResolvedValue([{ repo: '/repo', status: 'warn', warnings: ['dirty'] }]);
    checkServices.mockResolvedValue([{ name: 'db', status: 'up', latencyMs: 10 }]);
    checkSystem.mockResolvedValue({ disk: { path: '/', usedPercent: 10, status: 'ok' }, nodeVersions: [], pnpmVersions: [], warnings: [] });
    const { runCheck } = await import('../../src/commands/check.js');
    await expect(runCheck()).resolves.toBe(1);
  });

  it('returns exit code 2 for errors', async () => {
    checkRepos.mockResolvedValue([{ repo: '/repo', status: 'error', warnings: ['missing'] }]);
    checkServices.mockResolvedValue([{ name: 'db', status: 'up', latencyMs: 10 }]);
    checkSystem.mockResolvedValue({ disk: { path: '/', usedPercent: 10, status: 'ok' }, nodeVersions: [], pnpmVersions: [], warnings: [] });
    const { runCheck } = await import('../../src/commands/check.js');
    await expect(runCheck()).resolves.toBe(2);
  });

  it('runs the checker groups concurrently', async () => {
    checkRepos.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve([{ repo: '/repo', status: 'ok', warnings: [] }]), 30)));
    checkServices.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve([{ name: 'db', status: 'up', latencyMs: 1 }]), 30)));
    checkSystem.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ disk: { path: '/', usedPercent: 10, status: 'ok' }, nodeVersions: [], pnpmVersions: [], warnings: [] }), 30)));
    const { runCheck } = await import('../../src/commands/check.js');
    const started = Date.now();
    await runCheck();
    expect(Date.now() - started).toBeLessThan(80);
  });

  it('isolates a checker failure and still writes the report', async () => {
    checkRepos.mockRejectedValue(new Error('boom'));
    checkServices.mockResolvedValue([{ name: 'db', status: 'up', latencyMs: 10 }]);
    checkSystem.mockResolvedValue({ disk: { path: '/', usedPercent: 10, status: 'ok' }, nodeVersions: [], pnpmVersions: [], warnings: [] });
    const { runCheck } = await import('../../src/commands/check.js');
    await expect(runCheck()).resolves.toBe(2);
    expect(writeMarkdownReport).toHaveBeenCalledTimes(1);
  });

  it('renders markdown sections and overall status', async () => {
    const { renderMarkdownReport } = await import('../../src/output/report.js');
    const markdown = renderMarkdownReport({
      git: [{ repo: '/repo', status: 'warn', warnings: ['dirty'] }],
      services: [{ name: 'db', status: 'down', latencyMs: null }],
      system: { disk: { path: '/', usedPercent: 85, status: 'warn' }, nodeVersions: [], pnpmVersions: [], warnings: ['Disk usage at 85% for /.'] },
      warningCount: 3,
      errorCount: 0,
      overall: 'warn'
    }, new Date('2026-04-07T18:40:00.000Z'));
    expect(markdown).toContain('## Git');
    expect(markdown).toContain('## Services');
    expect(markdown).toContain('## System');
    expect(markdown).toContain('- Overall: warn');
  });

  it('auto-creates the report directory', async () => {
    vi.resetModules();
    const ensureDir = vi.fn();
    const writeFile = vi.fn();
    vi.doMock('../../src/utils/fs.js', () => ({ ensureDir, expandHome: () => '/home/test/.sentinel' }));
    vi.doMock('node:fs/promises', () => ({ writeFile }));
    const report = await vi.importActual<typeof import('../../src/output/report.js')>('../../src/output/report.js');
    await report.writeMarkdownReport({ git: [], services: [], system: { disk: { path: '/', usedPercent: 10, status: 'ok' }, nodeVersions: [], pnpmVersions: [], warnings: [] }, warningCount: 0, errorCount: 0, overall: 'ok' }, new Date('2026-04-07T18:40:00.000Z'));
    expect(ensureDir).toHaveBeenCalledWith('/home/test/.sentinel');
    expect(writeFile).toHaveBeenCalledTimes(1);
  });
});
