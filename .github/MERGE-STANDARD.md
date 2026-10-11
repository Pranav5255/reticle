# Merge standard

A PR merges only when every gate that applies to its diff has run and passed on its final SHA.

The live ruleset on `reticlehq/reticle` `main` requires `gate` and `dco`. Nobody can merge with a red `gate` (`bypass_actors` is empty). That is not the same as "every gate passed".

## What `gate` covers today

`gate` is the aggregate in `.github/workflows/ci.yml`. It passes when every job in its `needs:` list succeeded or was skipped. Path routing and event-specific matrices decide which jobs run.

Covered when they run: `format-check`, `verify`, `unit-tests`, `smoke`, `e2e`, `install-packages`, `install-gate`, `matrix-records`, `windows`, `macos`, `rust`, `rust-audit`, `rust-macos`, `desktop-e2e`, `conformance`, `bench`, `multi-agent`, `launchers`, `early-gates`, `break-matrix`, and `package-quality`.

## What `gate` does not cover, or covers only after merge

| Gap | What happens today | Close with |
| --- | --- | --- |
| Bench on a PR | `bench` runs on push to main, nightly, and dispatch. It is quarantined in `.github/flaky.json` (the parity guard requires that) while it is red on main. | Add `merge_group` to its `if:` and delete the entry after three consecutive green nightlies on main. Until then a red `bench` on the nightly or a manual run is expected and turns that run's `gate` red. |
| Windows install in the queue | A PR runs one Windows scaffold (`vite-react`). The queue runs zero Windows install cells. Nightly and dispatch run all 13 on Windows. Each cell is quarantined in `.github/flaky.json`. | Add a cell to the `merge_group` branch of `install_matrix` and delete its entry after three consecutive green nightlies for that cell. |
| package-quality | Lived in a separate workflow with no `merge_group` trigger, so requiring it stalled the queue. | Runs as a `ci.yml` job in `gate.needs`. |
| break-gates | Lived in `break-gates.yml`, triggered only on `break/**` and `install/**`, not on `init/**` or setup. Not in `gate`. | Runs as three `ci.yml` jobs behind a `break` route, in `gate.needs`. |
| CodeQL | Separate workflow. The check name is `analyze (javascript-typescript)`. It has `merge_group`. The ruleset does not require it. | Maintainer ruleset change. See `REPOSITORY-SETTINGS.md`. |
| Skipped counts as green | A job the router turns off reports `skipped`, and `gate` accepts it. | `scripts/ci/changes.mjs`: a path no tier or package matches, or any workflow or router edit, turns every tier on. |
| First-attempt red hidden by retry | Integration retries 3 times, e2e 2, and logs uploaded only on final failure. | An unquarantined failure fails on attempt 1. A quarantined one retries once, prints a warning, and every attempt's logs are uploaded `if: always()`. |
| Nightly red unnoticed | Scheduled runs fail after merge and open no issue. | `nightly-watch`, after `gate` on the nightly or a manual run on `main`, opens or updates one issue. Outside `gate`. |
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

## Core rules

1. **Parity.** A job that can run on push to `main` must be able to run on `merge_group`, with the same routing. The only exceptions are side-effect jobs (`fixtures-dispatch`, `nightly-watch`) and an issue-linked entry in `.github/flaky.json`. It covers whole jobs (bench) and single install cells (`install-gate/<os>/<scaffold>`).
