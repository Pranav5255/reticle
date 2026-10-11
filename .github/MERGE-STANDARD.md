# Merge standard

A PR merges only when every gate that applies to its diff has run and passed on its final SHA.

The live ruleset on `reticlehq/reticle` `main` requires `gate` and `dco`. Nobody can merge with a red `gate` (`bypass_actors` is empty). That is not the same as "every gate passed".

## What `gate` covers today

`gate` is the aggregate in `.github/workflows/ci.yml`. It passes when every job in its `needs:` list succeeded or was skipped. Path routing and event-specific matrices decide which jobs run.

Covered when they run: `format-check`, `verify`, `unit-tests`, `smoke`, `e2e`, `install-packages`, `install-gate`, `matrix-records`, `windows`, `macos`, `rust`, `rust-audit`, `rust-macos`, `desktop-e2e`, `conformance`, `bench`, `multi-agent`, plus (after the workflow changes in this branch) `launchers`, `early-gates`, `break-matrix`, and `package-quality`.

## What `gate` does not cover, or covers only after merge

| Gap | What happens today | Close with |
| --- | --- | --- |
| Bench on a PR | `bench` runs on push to main, nightly, and dispatch. The merge queue does not run bench until VE is green on three consecutive fork dispatch runs for one SHA. | Re-add `merge_group` after those three greens. |
| Windows install in the queue | A PR runs one Windows scaffold (`vite-react`). The queue runs zero Windows install cells. Nightly and dispatch run all 13 on Windows. | Re-add reliable cells to `merge_group` after three green dispatch runs per cell. Tracking: no issue filed yet. |
| package-quality | Lived in a separate workflow with no `merge_group` trigger, so requiring it stalled the queue. | Folded into `ci.yml` and `gate.needs` (this branch). |
| break-gates | Lived in `break-gates.yml`, triggered only on `break/**` and `install/**`, not on `init/**` or setup. Not in `gate`. | Folded into `ci.yml` behind a `break` route and `gate.needs` (this branch). |
| CodeQL | Separate workflow. The check name is `analyze (javascript-typescript)`. It has `merge_group`. The ruleset does not require it. | Maintainer ruleset change. See `REPOSITORY-SETTINGS.md`. |
| Skipped counts as green | A job the router turns off reports `skipped`, and `gate` accepts it. | Fail-safe: an unrouted new path turns every tier on (this branch). |
| First-attempt red hidden by retry | Integration retries 3 times, e2e 2, and logs uploaded only on final failure. | Each failed attempt is copied to `artifacts/attempt-N/` and uploaded `if: always()` (this branch). |
| Nightly red unnoticed | Scheduled runs fail after merge and open no issue. | `nightly-watch` job on `schedule` only, outside `gate` (this branch). |
| Zero required reviews | `required_approving_review_count` is 0. | Maintainer ruleset change. |

## Proposed ruleset (maintainer applies this)

Require `gate` and `dco` (already required) plus `analyze (javascript-typescript)`. Require 1 approving review. Do not require the old `package-quality` or `break-gates` check names; those jobs now live inside `gate`.

The ruleset belongs to the maintainer. This file prepares the change. It does not apply it.

```required-checks
gate
dco
analyze (javascript-typescript)
```

Compare that fence to the live ruleset with `node scripts/ci/required-checks-drift.mjs`. The mismatch it reports today (live is `gate` and `dco` only) is expected until a maintainer applies the proposed ruleset.
