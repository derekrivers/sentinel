import { beforeEach, describe, expect, it, vi } from 'vitest';

const readText = vi.fn();
vi.mock('../../src/utils/fs.js', () => ({
  expandHome: (input: string) => input.replace('~', '/home/tester'),
  readText,
  ensureDir: vi.fn(),
  pathExists: vi.fn()
}));

describe('loadConfig', () => {
  beforeEach(() => {
    vi.resetModules();
    readText.mockReset();
  });

  it('loads a valid config', async () => {
    readText.mockResolvedValue(JSON.stringify({ repos: ['/repo'], services: [], thresholds: { branchStaleDays: 7 } }));
    const { loadConfig } = await import('../../src/config/loadConfig.js');
    await expect(loadConfig()).resolves.toMatchObject({ repos: ['/repo'], diskPath: '/', thresholds: { diskWarningPercent: 80, branchStaleDays: 7 } });
  });

  it('reports a missing config file', async () => {
    readText.mockRejectedValue(new Error('ENOENT'));
    const { loadConfig } = await import('../../src/config/loadConfig.js');
    await expect(loadConfig()).rejects.toMatchObject({ message: expect.stringContaining('No Sentinel config found') });
  });

  it('reports malformed json clearly', async () => {
    readText.mockResolvedValue('{ nope');
    const { loadConfig } = await import('../../src/config/loadConfig.js');
    await expect(loadConfig()).rejects.toMatchObject({ message: expect.stringContaining('Failed to parse'), details: [expect.stringContaining('JSON')] });
  });

  it('reports schema validation issues', async () => {
    readText.mockResolvedValue(JSON.stringify({ repos: [''], services: [{ name: '', host: '', port: 99999 }], thresholds: { branchStaleDays: 0 } }));
    const { loadConfig } = await import('../../src/config/loadConfig.js');
    await expect(loadConfig()).rejects.toMatchObject({ message: 'Config validation failed.', details: expect.arrayContaining([expect.stringContaining('repos.0'), expect.stringContaining('services.0.name'), expect.stringContaining('thresholds.branchStaleDays')]) });
  });
});
