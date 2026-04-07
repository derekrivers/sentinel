import path from 'node:path';
import { ZodError } from 'zod';
import type { SentinelConfig } from '../types.js';
import { expandHome, readText } from '../utils/fs.js';
import { configSchema, formatZodIssues } from './schema.js';

export class ConfigError extends Error {
  constructor(message: string, public readonly details: string[] = []) {
    super(message);
  }
}

export function getConfigPath(): string {
  return path.join(expandHome('~/.sentinel'), 'config.json');
}

export async function loadConfig(): Promise<SentinelConfig> {
  const configPath = getConfigPath();
  let raw: string;

  try {
    raw = await readText(configPath);
  } catch {
    throw new ConfigError(`No Sentinel config found at ${configPath}. Create ~/.sentinel/config.json to get started.`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown JSON parse error';
    throw new ConfigError(`Failed to parse ${configPath}.`, [message]);
  }

  try {
    return configSchema.parse(parsed);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ConfigError('Config validation failed.', formatZodIssues(error));
    }
    throw error;
  }
}
