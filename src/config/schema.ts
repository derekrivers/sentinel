import { z } from 'zod';

export const configSchema = z.object({
  repos: z.array(z.string().min(1, 'Repo path cannot be empty')).default([]),
  services: z.array(z.object({
    name: z.string().min(1, 'Service name is required'),
    host: z.string().min(1, 'Service host is required'),
    port: z.number().int().min(1).max(65535)
  })).default([]),
  diskPath: z.string().min(1).default('/'),
  thresholds: z.object({
    diskWarningPercent: z.number().min(1).max(100).default(80),
    branchStaleDays: z.number().int().min(1).default(30)
  }).default({ diskWarningPercent: 80, branchStaleDays: 30 })
});

export type ConfigInput = z.infer<typeof configSchema>;

function formatIssuePath(path: (string | number)[]): string {
  if (path.length === 0) {
    return 'config';
  }

  return path.reduce<string>((result, segment) => {
    if (typeof segment === 'number') {
      return `${result}[${segment}]`;
    }

    return result ? `${result}.${segment}` : segment;
  }, '');
}

export function formatZodIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => `${formatIssuePath(issue.path)}: ${issue.message}`);
}
