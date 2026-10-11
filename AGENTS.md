# Agent notes (this checkout)

Read `CLAUDE.md` first. Then this file.

## This tree is fork-only

- Push and open PRs only against `origin` (`Pranav5255/reticle`).
- Never `git push` to `upstream` (`reticlehq/reticle`). Never open a PR against it. Never dispatch `publish.yml` or `publish-crate.yml`.
- Branch names must not contain `froncort`. Use `feature-pranav/<slug>`.
- Qualify with `docs/pre-pr-qualification.md` before claiming green.

## Contributor skills

| Skill | Trigger | Path |
| --- | --- | --- |
| wire-into-gates | adding a package, adapter, tool, flag, scaffold, workflow job, or `gate:`/`test:` script | `.claude/skills/wire-into-gates/SKILL.md` |
| qualify-before-pr | before a PR, or claiming a branch is green | `.claude/skills/qualify-before-pr/SKILL.md` |
| triage-ci-red | a CI run, merge-queue entry or nightly is red | `.claude/skills/triage-ci-red/SKILL.md` |
| edit-ci-workflow | any edit under `.github/workflows/` | `.claude/skills/edit-ci-workflow/SKILL.md` |
| gate-drift-audit | weekly, before a release, or "are the docs right about CI" | `.claude/skills/gate-drift-audit/SKILL.md` |

The public user skill is still root `SKILL.md`. Do not put contributor skills in `skills/`.

## When X, read Y

- New workspace package or `package.json` / `pnpm-workspace.yaml`: `wire-into-gates`.
- Edit under `.github/workflows/`: `edit-ci-workflow`.
- `git push` or `gh pr create`: `qualify-before-pr`. The ledger must have rows for HEAD.
- Red CI: `triage-ci-red`.
- Docs vs live CI: `gate-drift-audit`.

## Gate currency

- Path routing: `scripts/ci/changes.mjs` and `scripts/ci/tier-patterns.json`.
- New workspace package: a row in `scripts/ci/tier-map.json`.
- New expensive job: a `gate.needs` entry.
- After changing a gate: update `.github/MERGE-STANDARD.md` and run `node scripts/ci/render-gates-table.mjs`.
- A new check is unverified until it has been seen red, then green.
- `pnpm verify` before every commit. Do not invent field-telemetry numbers.
