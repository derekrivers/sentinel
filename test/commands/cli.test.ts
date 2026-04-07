import { beforeEach, describe, expect, it, vi } from 'vitest';

const runCheck = vi.fn();

vi.mock('../../src/commands/check.js', () => ({ runCheck }));

describe('cli main', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    runCheck.mockReset();
  });

  it('prints usage and exits 1 for unsupported invocations', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { main, formatUsage } = await import('../../src/cli.js');

    await expect(main([])).resolves.toBe(1);
    expect(runCheck).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(formatUsage());
  });

  it('prints usage and exits 1 when extra arguments are provided', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { main } = await import('../../src/cli.js');

    await expect(main(['check', '--verbose'])).resolves.toBe(1);
    expect(runCheck).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it('runs the check command and returns its exit code', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    runCheck.mockResolvedValue(0);
    const { main } = await import('../../src/cli.js');

    await expect(main(['check'])).resolves.toBe(0);
    expect(runCheck).toHaveBeenCalledTimes(1);
  });

  it('renders config errors without a stack trace and exits 1', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { ConfigError } = await import('../../src/config/loadConfig.js');
    runCheck.mockRejectedValue(new ConfigError('Config validation failed.', ['repos[0]: Repo path cannot be empty']));
    const { main } = await import('../../src/cli.js');

    await expect(main(['check'])).resolves.toBe(1);
    expect(errorSpy).toHaveBeenNthCalledWith(1, 'Config validation failed.');
    expect(errorSpy).toHaveBeenNthCalledWith(2, '- repos[0]: Repo path cannot be empty');
  });
});
