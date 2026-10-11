---
name: wire-into-gates
description: Use when adding a workspace package, adapter, MCP tool, CLI command or flag, install scaffold, workflow job, or a gate:/test: script.
---

# Wire the change into the gates

Follow the verification loop in `AGENTS.md` (STATE, RUN, CAPTURE, CHECK, COMPARE, RECORD, RE-CHECK). A claim of green needs a ledger row for the final SHA.

1. **Routing.** Add the package to `scripts/ci/tier-map.json`. A non-package path needs a pattern in `scripts/ci/tier-patterns.json`. A path that matches no tier turns every tier on.
2. **Aggregate.** A new job is in `gate.needs` in `.github/workflows/ci.yml`, runs on `pull_request` and `merge_group`, and is listed by `ci-gate-completeness` / `ci-aggregate-covers-jobs`.
3. **Tool.** `TOOLS` / `VERDICT_TOOLS` (CLAUDE.md rule 10), an e2e spec, and the bench route if the surface moved.
4. **Scaffold.** `apps/e2e/install-baseline.json` via `pnpm gate:install --update-baseline --only <id>`.
5. **Script.** Every root `gate:` / `test:` script is a `gate.needs` job or an excuse in `scripts/ci/script-excuses.json`.
6. **Docs.** A routing row in `docs/gates.md`. Link from `CONTRIBUTING.md` and the PR template; do not copy.
7. **Prove it can fail.** Plant the defect, record red, revert, record green.
8. Rule 13: a new guard cites a shipped incident in its header.

Ledger: SHA, command, exit code, log path, red then green for the new check.
