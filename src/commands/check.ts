import { checkRepos } from '../checkers/git/checkRepos.js';
import { checkServices } from '../checkers/services/checkServices.js';
import { checkSystem } from '../checkers/system/checkSystem.js';
import { loadConfig } from '../config/loadConfig.js';
import { renderTerminal } from '../output/terminal.js';
import { writeMarkdownReport } from '../output/report.js';
import type { CheckRunResult, SectionFailure } from '../types.js';

async function protect<T>(task: () => Promise<T>, label: string): Promise<T | SectionFailure> {
  try {
    return await task();
  } catch (error) {
    return { status: 'error', message: `${label} failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

export function summarize(result: Omit<CheckRunResult, 'warningCount' | 'errorCount' | 'overall'>): CheckRunResult {
  const gitWarnings = Array.isArray(result.git) ? result.git.filter((item) => item.status === 'warn').length : 0;
  const gitErrors = Array.isArray(result.git) ? result.git.filter((item) => item.status === 'error').length : 1;
  const serviceWarnings = Array.isArray(result.services) ? result.services.filter((item) => item.status === 'down').length : 0;
  const serviceErrors = Array.isArray(result.services) ? 0 : 1;
  const systemWarnings = 'warnings' in result.system ? result.system.warnings.length : 0;
  const systemErrors = 'warnings' in result.system ? (result.system.disk?.status === 'error' ? 1 : 0) : 1;
  const warningCount = gitWarnings + serviceWarnings + systemWarnings;
  const errorCount = gitErrors + serviceErrors + systemErrors;
  const overall = errorCount > 0 ? 'error' : warningCount > 0 ? 'warn' : 'ok';
  return { ...result, warningCount, errorCount, overall };
}

export async function runCheck(): Promise<number> {
  const config = await loadConfig();
  const [git, services, system] = await Promise.all([
    protect(() => checkRepos(config.repos, config.thresholds.branchStaleDays), 'Git checks'),
    protect(() => checkServices(config.services), 'Service checks'),
    protect(() => checkSystem(config.repos, config.diskPath, config.thresholds.diskWarningPercent), 'System checks')
  ]);

  const result = summarize({ git, services, system });
  console.log(renderTerminal(result));
  await writeMarkdownReport(result);
  return result.overall === 'error' ? 2 : result.overall === 'warn' ? 1 : 0;
}
