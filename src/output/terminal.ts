import type { CheckRunResult, SectionFailure } from '../types.js';

const color = {
  green: (text: string) => `\u001b[32m${text}\u001b[0m`,
  yellow: (text: string) => `\u001b[33m${text}\u001b[0m`,
  red: (text: string) => `\u001b[31m${text}\u001b[0m`,
  cyan: (text: string) => `\u001b[36m${text}\u001b[0m`
};

function sectionHeading(label: string, status: 'ok' | 'warn' | 'error'): string {
  const badge = status === 'ok'
    ? color.green('✓ healthy')
    : status === 'warn'
      ? color.yellow('⚠ warning')
      : color.red('✗ error');

  return `${color.cyan(label)} ${badge}`;
}

function renderFailure(section: string, failure: SectionFailure): string {
  return `${sectionHeading(section, 'error')}\n${color.red(`✗ ${failure.message}`)}`;
}

export function renderTerminal(result: CheckRunResult): string {
  const lines: string[] = [];

  if (Array.isArray(result.git)) {
    const gitStatus = result.git.some((repo) => repo.status === 'error')
      ? 'error'
      : result.git.some((repo) => repo.status === 'warn')
        ? 'warn'
        : 'ok';
    lines.push(sectionHeading('Git', gitStatus));
    for (const repo of result.git) {
      const icon = repo.status === 'ok' ? color.green('✓') : repo.status === 'warn' ? color.yellow('⚠') : color.red('✗');
      const status = repo.status === 'ok' ? color.green('ok') : repo.status === 'warn' ? color.yellow('warn') : color.red('error');
      lines.push(`${icon} ${repo.repo}: ${status}`);
      repo.warnings.forEach((warning) => lines.push(`  - ${warning}`));
    }
  } else {
    lines.push(renderFailure('Git', result.git));
  }

  if (Array.isArray(result.services)) {
    const servicesStatus = result.services.some((service) => service.status === 'down') ? 'error' : 'ok';
    lines.push('', sectionHeading('Services', servicesStatus));
    for (const service of result.services) {
      const icon = service.status === 'up' ? color.green('✓') : color.red('✗');
      const status = service.status === 'up' ? color.green('up') : color.red('down');
      const latency = service.latencyMs === null ? '' : ` (${service.latencyMs}ms)`;
      lines.push(`${icon} ${service.name}: ${status}${latency}`);
    }
  } else {
    lines.push('', renderFailure('Services', result.services));
  }

  if ('status' in result.system) {
    lines.push('', renderFailure('System', result.system));
  } else {
    const systemStatus = result.system.disk?.status === 'error'
      ? 'error'
      : result.system.warnings.length > 0 || result.system.nodeVersions.some((item) => !item.match) || result.system.pnpmVersions.some((item) => !item.match)
        ? 'warn'
        : 'ok';

    lines.push('', sectionHeading('System', systemStatus));

    if (result.system.disk) {
      const diskIcon = result.system.disk.status === 'ok' ? color.green('✓') : result.system.disk.status === 'warn' ? color.yellow('⚠') : color.red('✗');
      const diskStatus = result.system.disk.status === 'ok'
        ? color.green(result.system.disk.status)
        : result.system.disk.status === 'warn'
          ? color.yellow(result.system.disk.status)
          : color.red(result.system.disk.status);
      lines.push(`${diskIcon} Disk ${result.system.disk.path}: ${diskStatus} at ${result.system.disk.usedPercent}%`);
    } else {
      lines.push(`${color.yellow('⚠')} Disk: ${color.yellow('unavailable')}`);
    }

    result.system.nodeVersions.forEach((item) => lines.push(`${item.match ? color.green('✓') : color.yellow('⚠')} Node ${item.repo}: ${item.match ? color.green('match') : color.yellow('mismatch')} (expected ${item.expected}, actual ${item.actual})`));
    result.system.pnpmVersions.forEach((item) => lines.push(`${item.match ? color.green('✓') : color.yellow('⚠')} pnpm ${item.repo}: ${item.match ? color.green('match') : color.yellow('mismatch')} (expected ${item.expected}, actual ${item.actual})`));
    result.system.warnings.forEach((warning) => lines.push(`  - ${warning}`));
  }

  const overall = result.overall === 'ok'
    ? color.green('✓ Overall status: healthy')
    : result.overall === 'warn'
      ? color.yellow(`⚠ Overall status: warning (${result.warningCount} warning(s))`)
      : color.red(`✗ Overall status: error (${result.errorCount} error(s))`);

  lines.push('', overall);
  return lines.join('\n');
}
