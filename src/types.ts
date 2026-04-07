export type RepoStatus = 'ok' | 'warn' | 'error';
export type ServiceStatus = 'up' | 'down';
export type SystemStatus = 'ok' | 'warn' | 'error';

export interface SentinelConfig {
  repos: string[];
  services: Array<{ name: string; host: string; port: number }>;
  diskPath: string;
  thresholds: { diskWarningPercent: number; branchStaleDays: number };
}

export interface RepoCheckResult { repo: string; status: RepoStatus; warnings: string[]; }
export interface ServiceCheckResult { name: string; status: ServiceStatus; latencyMs: number | null; }
export interface DiskCheckResult { path: string; usedPercent: number; status: SystemStatus; }
export interface VersionCheckResult { repo: string; expected: string; actual: string; match: boolean; }
export interface SystemCheckResult {
  disk: DiskCheckResult | null;
  nodeVersions: VersionCheckResult[];
  pnpmVersions: VersionCheckResult[];
  warnings: string[];
}
export interface SectionFailure { status: 'error'; message: string; }
export interface CheckRunResult {
  git: RepoCheckResult[] | SectionFailure;
  services: ServiceCheckResult[] | SectionFailure;
  system: SystemCheckResult | SectionFailure;
  warningCount: number;
  errorCount: number;
  overall: 'ok' | 'warn' | 'error';
}
