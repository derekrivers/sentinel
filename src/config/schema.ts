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

export function formatZodIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join('.') : 'config';
    return `${path}: ${issue.message}`;
  });
}
