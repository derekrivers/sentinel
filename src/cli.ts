#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCheck } from './commands/check.js';
import { ConfigError } from './config/loadConfig.js';

const USAGE = [
  'Usage: sentinel check',
  '',
  'Commands:',
  '  check    Run the Sentinel health checks'
].join('\n');

export function formatUsage(): string {
  return USAGE;
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const [command, ...rest] = argv;

  if (command !== 'check' || rest.length > 0) {
    console.error(formatUsage());
    return 1;
  }

  try {
    return await runCheck();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(error.message);
      error.details.forEach((detail) => console.error(`- ${detail}`));
      return 1;
    }

    console.error(error instanceof Error ? error.message : 'Unexpected error');
    return 2;
  }
}

function isEntrypoint(argv: string[] = process.argv): boolean {
  const invokedPath = argv[1];

  if (!invokedPath) {
    return false;
  }

  return path.resolve(invokedPath) === fileURLToPath(import.meta.url);
}

if (isEntrypoint()) {
  void main().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
