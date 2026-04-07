# Sentinel

Sentinel is a local developer environment health monitor CLI. Run `sentinel check` to audit configured repositories, services, and basic system drift, then persist a daily Markdown report to `~/.sentinel/report-YYYY-MM-DD.md`.

## Installation

```bash
pnpm install
pnpm build
pnpm check
```

## Config schema

Sentinel loads `~/.sentinel/config.json` on every invocation.

```json
{
  "repos": ["/absolute/path/to/repo"],
  "services": [
    { "name": "Postgres", "host": "127.0.0.1", "port": 5432 }
  ],
  "diskPath": "/",
  "thresholds": {
    "diskWarningPercent": 80,
    "branchStaleDays": 30
  }
}
```

Defaults applied by the config schema:
- `repos`: `[]`
- `services`: `[]`
- `diskPath`: `/`
- `thresholds`: `{ "diskWarningPercent": 80, "branchStaleDays": 30 }`

## Output

Terminal sections:
- `Git`
- `Services`
- `System`
- overall status line: `✓ All systems healthy`, `⚠ X warning(s) found`, or `✗ X error(s) found`

Example report:

```md
# Sentinel Report

- Overall: warn
- Timestamp: 2026-04-07T18:40:00.000Z

## Git
- /repo/app: warn
  - Working tree has uncommitted changes.

## Services
- Postgres: up (12ms)

## System
- Disk: ok at 62% (/)
```
