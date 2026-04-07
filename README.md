# Sentinel

Sentinel is a local developer environment health monitor CLI. Run `sentinel check` to audit configured repositories, services, and basic system drift, then persist a daily Markdown report to `~/.sentinel/report-YYYY-MM-DD.md`.

## Installation

Install dependencies, build the CLI, and run a check:

```bash
pnpm install
pnpm build
pnpm check
```

If you want the executable on your `PATH`, link it locally after building:

```bash
pnpm link --global
sentinel check
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
- `thresholds.diskWarningPercent`: `80`
- `thresholds.branchStaleDays`: `30`

## Running checks

`sentinel check` runs the Git, Services, and System checker groups concurrently. Every run writes or overwrites that day's Markdown report at `~/.sentinel/report-YYYY-MM-DD.md`, and Sentinel creates `~/.sentinel/` automatically if it does not exist yet.

Exit codes:
- `0` when all checks are healthy
- `1` when warnings are present and no errors exist
- `2` when any error exists

## Example terminal output

```text
Git ✓ healthy
✓ /repo/app: ok

Services ✓ healthy
✓ Postgres: up (12ms)

System ⚠ warning
⚠ Disk /: warn at 82%
⚠ Node /repo/app: mismatch (expected v22.11.0, actual v22.10.0)
  - Disk usage at 82% for /.
  - /repo/app expects Node v22.11.0 but active version is v22.10.0.

⚠ Overall status: warning (2 warning(s))
```

If an individual checker crashes unexpectedly, Sentinel converts that section into an error block and still completes the rest of the run.

## Example report output

```md
# Sentinel Report

- Overall: warn
- Timestamp: 2026-04-07T18:40:00.000Z
- Warnings: 2
- Errors: 0

## Git
- /repo/app: warn
  - Working tree has uncommitted changes.

## Services
- Postgres: up (12ms)

## System
- Disk: ok at 62% (/)
- Node versions: no pinned Node versions detected.
- pnpm versions: no pinned pnpm versions detected.
```
