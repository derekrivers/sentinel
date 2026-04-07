import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import type { CheckRunResult } from '../types.js';
import { ensureDir, expandHome } from '../utils/fs.js';

function dateStamp(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function renderMarkdownReport(result: CheckRunResult, now = new Date()): string {
  const lines = [
    '# Sentinel Report',
    '',
    `- Overall: ${result.overall}`,
    `- Timestamp: ${now.toISOString()}`,
    `- Warnings: ${result.warningCount}`,
    `- Errors: ${result.errorCount}`,
    ''
  ];

  lines.push('## Git');
  if (Array.isArray(result.git)) {
    if (result.git.length === 0) lines.push('- No repositories configured.');
    result.git.forEach((repo) => {
      lines.push(`- ${repo.repo}: ${repo.status}`);
      repo.warnings.forEach((warning) => lines.push(`  - ${warning}`));
    });
  } else {
    lines.push(`- Error: ${result.git.message}`);
  }

  lines.push('', '## Services');
  if (Array.isArray(result.services)) {
    if (result.services.length === 0) lines.push('- No services configured.');
    result.services.forEach((service) => lines.push(`- ${service.name}: ${service.status}${service.latencyMs === null ? '' : ` (${service.latencyMs}ms)`}`));
  } else {
    lines.push(`- Error: ${result.services.message}`);
  }

  lines.push('', '## System');
  if ('status' in result.system) {
    lines.push(`- Error: ${result.system.message}`);
  } else {
    if (result.system.disk) {
      lines.push(`- Disk: ${result.system.disk.status} at ${result.system.disk.usedPercent}% (${result.system.disk.path})`);
    } else {
      lines.push('- Disk: unavailable');
    }

    if (result.system.nodeVersions.length === 0) {
      lines.push('- Node versions: no pinned Node versions detected.');
    } else {
      result.system.nodeVersions.forEach((item) => lines.push(`- Node ${item.repo}: expected ${item.expected}, actual ${item.actual}, match=${item.match}`));
    }

    if (result.system.pnpmVersions.length === 0) {
      lines.push('- pnpm versions: no pinned pnpm versions detected.');
    } else {
      result.system.pnpmVersions.forEach((item) => lines.push(`- pnpm ${item.repo}: expected ${item.expected}, actual ${item.actual}, match=${item.match}`));
    }

    result.system.warnings.forEach((warning) => lines.push(`- ${warning}`));
  }

  return lines.join('\n') + '\n';
}

export async function writeMarkdownReport(result: CheckRunResult, now = new Date()): Promise<string> {
  const dir = expandHome('~/.sentinel');
  await ensureDir(dir);
  const filePath = path.join(dir, `report-${dateStamp(now)}.md`);
  await writeFile(filePath, renderMarkdownReport(result, now), 'utf8');
  return filePath;
}
