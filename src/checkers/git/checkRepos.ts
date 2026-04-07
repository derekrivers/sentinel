import path from 'node:path';
import { readFile } from 'node:fs/promises';
import type { RepoCheckResult } from '../../types.js';
import { pathExists } from '../../utils/fs.js';
import { runGit } from './gitProcess.js';

async function isGitRepo(repo: string): Promise<boolean> {
  try {
    return (await runGit(['rev-parse', '--is-inside-work-tree'], repo)) === 'true';
  } catch {
    return false;
  }
}

async function getBranchWarnings(repo: string, staleDays: number): Promise<string[]> {
  const warnings: string[] = [];
  const dirty = await runGit(['status', '--porcelain'], repo);
  if (dirty) warnings.push('Working tree has uncommitted changes.');

  const behind = await runGit(['rev-list', '--left-right', '--count', 'HEAD...@{u}'], repo)
    .then((value) => value.split(/\s+/)[1] ?? '0')
    .catch((error) => { throw error; });
  if (Number(behind) > 0) warnings.push(`Current branch is behind remote by ${behind} commit(s).`);

  const branches = await runGit(['for-each-ref', '--format=%(refname:short)|%(committerdate:unix)|%(upstream:short)', 'refs/heads'], repo);
  const now = Date.now();
  for (const line of branches.split('\n').filter(Boolean)) {
    const [name, ts, upstream] = line.split('|');
    const ageDays = (now - Number(ts) * 1000) / 86400000;
    if (ageDays >= staleDays && !upstream) {
      warnings.push(`Local branch ${name} is stale (${Math.floor(ageDays)} days old) and not pushed.`);
    }
  }
  return warnings;
}

export async function checkRepos(repos: string[], staleDays: number): Promise<RepoCheckResult[]> {
  return Promise.all(repos.map(async (repo) => {
    if (!(await pathExists(repo))) {
      return { repo, status: 'error', warnings: ['Repository path does not exist.'] };
    }

    if (!(await isGitRepo(repo))) {
      return { repo, status: 'error', warnings: ['Path exists but is not a git repository.'] };
    }

    try {
      const warnings = await getBranchWarnings(repo, staleDays);
      return { repo, status: warnings.length ? 'warn' : 'ok', warnings };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown git error';
      return { repo, status: 'error', warnings: [message] };
    }
  }));
}

export async function readNvmrc(repo: string): Promise<string | null> {
  const filePath = path.join(repo, '.nvmrc');
  if (!(await pathExists(filePath))) return null;
  return (await readFile(filePath, 'utf8')).trim();
}
