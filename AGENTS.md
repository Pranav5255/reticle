# Agent notes

Read `CLAUDE.md` first. Then this file.

Qualify with `docs/pre-pr-qualification.md` before claiming green.

## Contributor skills

| Skill | Trigger | Path |
| --- | --- | --- |
| wire-into-gates | adding a package, adapter, tool, flag, scaffold, workflow job, or `gate:`/`test:` script | `.claude/skills/wire-into-gates/SKILL.md` |
| qualify-before-pr | before a PR, or claiming a branch is green | `.claude/skills/qualify-before-pr/SKILL.md` |
| triage-ci-red | a CI run, merge-queue entry or nightly is red | `.claude/skills/triage-ci-red/SKILL.md` |
| edit-ci-workflow | any edit under `.github/workflows/` | `.claude/skills/edit-ci-workflow/SKILL.md` |
| gate-drift-audit | weekly, before a release, or "are the docs right about CI" | `.claude/skills/gate-drift-audit/SKILL.md` |
| weaken-a-gate-safely | touching `flaky.json`, excuses, baselines, `gate.needs` or `tier-patterns.json` | `.claude/skills/weaken-a-gate-safely/SKILL.md` |

The public user skill is still root `SKILL.md`. Do not put contributor skills in `skills/`.

## When X, read Y

- New workspace package or `package.json` / `pnpm-workspace.yaml`: `wire-into-gates`.
- Edit under `.github/workflows/`: `edit-ci-workflow`.
- `git push` or `gh pr create`: `qualify-before-pr`. The PR body needs evidence for HEAD.
- Red CI: `triage-ci-red`.
- Docs vs live CI: `gate-drift-audit`.
- Loosening a gate: `weaken-a-gate-safely`.

## Gate currency

- Path routing: `scripts/ci/changes.mjs` reads `scripts/ci/tier-map.json` and `scripts/ci/tier-patterns.json`. Confirm a sample file from a new package routes the map's tiers.
- A new expensive job is in `gate.needs` and can run on `merge_group` (parity check), or is an expiring `flaky.json` entry.
- After changing a gate: update `.github/MERGE-STANDARD.md`.
- A new check is unverified until it has been seen red, then green.
- `pnpm verify` before every commit. Do not invent field-telemetry numbers.
