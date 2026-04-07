import path from 'node:path';
import { readFile } from 'node:fs/promises';
import type { DiskCheckResult, SystemCheckResult, VersionCheckResult } from '../../types.js';
import { pathExists } from '../../utils/fs.js';
import { runCommand } from '../../utils/process.js';
import { readNvmrc } from '../git/checkRepos.js';

export async function getDiskUsage(targetPath: string): Promise<number> {
  const { stdout } = await runCommand('df', ['-Pk', targetPath]);
  const lines = stdout.trim().split('\n');
  const last = lines.at(-1) ?? '';
  const use = last.split(/\s+/)[4] ?? '0%';
  return Number(use.replace('%', ''));
}

export async function checkDisk(pathToCheck: string, warningPercent: number): Promise<DiskCheckResult> {
  const usedPercent = await getDiskUsage(pathToCheck);
  const status = usedPercent >= 95 ? 'error' : usedPercent >= warningPercent ? 'warn' : 'ok';
  return { path: pathToCheck, usedPercent, status };
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
  const [disk, nodeVersions, pnpmVersions] = await Promise.all([
    checkDisk(diskPath, warningPercent),
    checkNodeVersions(repos),
    checkPnpmVersions(repos)
  ]);

  const warnings = [
    ...(disk.status !== 'ok' ? [`Disk usage at ${disk.usedPercent}% for ${disk.path}.`] : []),
    ...nodeVersions.filter((item) => !item.match).map((item) => `${item.repo} expects Node ${item.expected} but active version is ${item.actual}.`),
    ...pnpmVersions.filter((item) => !item.match).map((item) => `${item.repo} expects pnpm ${item.expected} but active version is ${item.actual}.`)
  ];

  return { disk, nodeVersions, pnpmVersions, warnings };
}
