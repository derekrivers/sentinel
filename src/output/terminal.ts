import type { CheckRunResult, SectionFailure } from '../types.js';

const color = {
  green: (text: string) => `\u001b[32m${text}\u001b[0m`,
  yellow: (text: string) => `\u001b[33m${text}\u001b[0m`,
  red: (text: string) => `\u001b[31m${text}\u001b[0m`,
  cyan: (text: string) => `\u001b[36m${text}\u001b[0m`
};

function renderFailure(section: string, failure: SectionFailure): string {
  return `${color.cyan(section)}\n${color.red(`✗ ${failure.message}`)}`;
}

export function renderTerminal(result: CheckRunResult): string {
  const lines: string[] = [];

  if (Array.isArray(result.git)) {
    lines.push(color.cyan('Git'));
    for (const repo of result.git) {
      const icon = repo.status === 'ok' ? color.green('✓') : repo.status === 'warn' ? color.yellow('⚠') : color.red('✗');
      lines.push(`${icon} ${repo.repo}`);
      repo.warnings.forEach((warning) => lines.push(`  - ${warning}`));
    }
  } else {
    lines.push(renderFailure('Git', result.git));
  }

  if (Array.isArray(result.services)) {
    lines.push('', color.cyan('Services'));
    for (const service of result.services) {
      const icon = service.status === 'up' ? color.green('✓') : color.red('✗');
      const status = service.status === 'up' ? color.green('up') : color.red('down');
      const latency = service.latencyMs === null ? '' : ` (${service.latencyMs}ms)`;
      lines.push(`${icon} ${service.name}: ${status}${latency}`);
    }
  } else {
    lines.push('', renderFailure('Services', result.services));
  }

  lines.push('', color.cyan('System'));
  if ('status' in result.system) {
    lines.push(color.red(`✗ ${result.system.message}`));
  } else {
    if (result.system.disk) {
      const diskIcon = result.system.disk.status === 'ok' ? color.green('✓') : result.system.disk.status === 'warn' ? color.yellow('⚠') : color.red('✗');
      const diskStatus = result.system.disk.status === 'ok'
        ? color.green(result.system.disk.status)
        : result.system.disk.status === 'warn'
          ? color.yellow(result.system.disk.status)
          : color.red(result.system.disk.status);
      lines.push(`${diskIcon} Disk ${result.system.disk.path}: ${diskStatus} at ${result.system.disk.usedPercent}%`);
    } else {
      lines.push(`${color.red('✗')} Disk: ${color.red('unavailable')}`);
    }

    result.system.nodeVersions.forEach((item) => lines.push(`${item.match ? color.green('✓') : color.yellow('⚠')} Node ${item.repo}: ${item.match ? color.green('match') : color.yellow('mismatch')} (expected ${item.expected}, actual ${item.actual})`));
    result.system.pnpmVersions.forEach((item) => lines.push(`${item.match ? color.green('✓') : color.yellow('⚠')} pnpm ${item.repo}: ${item.match ? color.green('match') : color.yellow('mismatch')} (expected ${item.expected}, actual ${item.actual})`));
    result.system.warnings.forEach((warning) => lines.push(`  - ${warning}`));
  }

  const overall = result.overall === 'ok'
    ? color.green('✓ All systems healthy')
    : result.overall === 'warn'
      ? color.yellow(`⚠ ${result.warningCount} warning(s) found`)
      : color.red(`✗ ${result.errorCount} error(s) found`);

  lines.push('', overall);
  return lines.join('\n');
}
