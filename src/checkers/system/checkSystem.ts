import path from 'node:path';
import { readFile } from 'node:fs/promises';
import type { DiskCheckResult, SystemCheckResult, VersionCheckResult } from '../../types.js';
import { pathExists } from '../../utils/fs.js';
import { runCommand } from '../../utils/process.js';
import { readNvmrc } from '../git/checkRepos.js';

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export async function getDiskUsage(targetPath: string): Promise<number> {
  const { stdout } = await runCommand('df', ['-Pk', targetPath]);
  const lines = stdout.trim().split('\n');
  const last = lines.at(-1) ?? '';
  const use = last.split(/\s+/)[4] ?? '0%';
  return Number(use.replace('%', ''));
}

export async function checkDisk(pathToCheck: string, warningPercent: number): Promise<DiskCheckResult> {
  const resolvedPath = pathToCheck || '/';
  const usedPercent = await getDiskUsage(resolvedPath);
  const status = usedPercent >= 95 ? 'error' : usedPercent >= warningPercent ? 'warn' : 'ok';
  return { path: resolvedPath, usedPercent, status };
}

export async function checkNodeVersions(repos: string[]): Promise<VersionCheckResult[]> {
  const actual = (await runCommand('node', ['--version'])).stdout.trim();
  const results: VersionCheckResult[] = [];

  for (const repo of repos) {
    const expected = await readNvmrc(repo);
    if (!expected) continue;
    results.push({ repo, expected, actual, match: expected === actual });
  }

  return results;
}

export async function checkPnpmVersions(repos: string[]): Promise<VersionCheckResult[]> {
  const actual = (await runCommand('pnpm', ['--version'])).stdout.trim();
  const results: VersionCheckResult[] = [];

  for (const repo of repos) {
    const pkgPath = path.join(repo, 'package.json');
    if (!(await pathExists(pkgPath))) continue;
    const pkg = JSON.parse(await readFile(pkgPath, 'utf8')) as { packageManager?: string };
    if (!pkg.packageManager?.startsWith('pnpm@')) continue;
    const expected = pkg.packageManager.slice(5);
    results.push({ repo, expected, actual, match: expected === actual });
  }

  return results;
}

export async function checkSystem(repos: string[], diskPath: string, warningPercent: number): Promise<SystemCheckResult> {
  const [diskResult, nodeResult, pnpmResult] = await Promise.allSettled([
    checkDisk(diskPath || '/', warningPercent),
    checkNodeVersions(repos),
    checkPnpmVersions(repos)
  ]);

  const disk = diskResult.status === 'fulfilled' ? diskResult.value : null;
  const nodeVersions = nodeResult.status === 'fulfilled' ? nodeResult.value : [];
  const pnpmVersions = pnpmResult.status === 'fulfilled' ? pnpmResult.value : [];

  const warnings = [
    ...(disk?.status && disk.status !== 'ok' ? [`Disk usage at ${disk.usedPercent}% for ${disk.path}.`] : []),
    ...(diskResult.status === 'rejected' ? [`Disk check failed: ${formatError(diskResult.reason)}`] : []),
    ...(nodeResult.status === 'rejected' ? [`Node version check failed: ${formatError(nodeResult.reason)}`] : []),
    ...(pnpmResult.status === 'rejected' ? [`pnpm version check failed: ${formatError(pnpmResult.reason)}`] : []),
    ...nodeVersions.filter((item) => !item.match).map((item) => `${item.repo} expects Node ${item.expected} but active version is ${item.actual}.`),
    ...pnpmVersions.filter((item) => !item.match).map((item) => `${item.repo} expects pnpm ${item.expected} but active version is ${item.actual}.`)
  ];

  return { disk, nodeVersions, pnpmVersions, warnings };
}
