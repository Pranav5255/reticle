---
name: edit-ci-workflow
description: Use when editing any file under .github/workflows/.
---

# Edit a CI workflow

1. Keep `gate.needs` complete. Every required job runs on `merge_group`.
2. Run `node scripts/ci/workflow-needs-exist.mjs` (planted `needs: [verfiy]` must fail).
3. Comments must match the code.
4. Run the CI guards with `--force` (`ci-routing-paths`, `ci-gate-completeness`, `ci-aggregate-covers-jobs`).
5. Dispatch on the fork and record the run. Do not push to `upstream`.

Ledger: SHA, which workflows changed, guard results, fork run id or NOT RUN.
