#!/usr/bin/env node
import { runCheck } from './commands/check.js';
import { ConfigError } from './config/loadConfig.js';

async function main(): Promise<void> {
  const command = process.argv[2];

  if (command !== 'check') {
    console.log('Usage: sentinel check');
    process.exitCode = 1;
    return;
  }

  try {
    process.exitCode = await runCheck();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(error.message);
      error.details.forEach((detail) => console.error(`- ${detail}`));
      process.exitCode = 1;
      return;
    }

    console.error(error instanceof Error ? error.message : 'Unexpected error');
    process.exitCode = 2;
  }
}

void main();
