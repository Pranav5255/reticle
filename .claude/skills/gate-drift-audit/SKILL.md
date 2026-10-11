---
name: gate-drift-audit
description: Use weekly, before a release, or when asked whether the docs are right about CI.
---

# Audit gate docs against CI

Compare `docs/gates.md`, `docs/required-checks.md`, `CONTRIBUTING.md`, `.github/PULL_REQUEST_TEMPLATE.md` and `.github/MERGE-STANDARD.md` against `.github/workflows/ci.yml` and the live ruleset.

1. `node scripts/ci/required-checks-drift.mjs --self-test`
2. `node scripts/ci/required-checks-drift.mjs` (read-only against `reticlehq/reticle`)
3. Output a correction list with line numbers. Do not edit without approval.

Ledger: documented checks, live checks or NOT MEASURED, the mismatch list.
