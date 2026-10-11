---
title: Qualify a pull request on your fork
description: The local commands, fork dispatch, and ledger row that must exist before a PR to upstream is opened.
---

This is the contributor workflow for every pull request to `reticlehq/reticle`. The routing table that says which extra gate a diff needs lives in [gates.md](./gates.md) section 1. This page is the procedure around that table: how to run every gate that applies, how to record the result, and when the claim of green is allowed.

Before opening a PR to upstream, run this page. A claim of green cites a ledger row.

## The verification loop

No sentence in a ledger entry, commit, PR, or chat message may state a result this loop has not produced.

1. State the claim as a falsifiable sentence (`pnpm test:e2e` passes on this SHA on macOS arm64).
2. Run the exact command. Never a paraphrase.
3. Capture command, `git rev-parse HEAD`, `git status --porcelain` (empty or listed), OS/arch, start/end time, exit code, and a log under `artifacts/gate-runs/<gate>-<sha>-<n>.log`.
4. Read the exit code and the tail of the log. A zero exit with "0 tests", "skipped", "NOT MEASURED", "no files", or a missing summary is not a pass. Chained commands must use `&&`.
5. Compare. If the evidence does not support the claim, rewrite the claim or mark it UNVERIFIED.
6. Record the row. Only then may the claim be repeated, and it must link the row.
7. Re-check before reuse. Any claim older than the last commit, rebase, or dependency change is STALE.

Wording: a run you did not watch is UNVERIFIED, not "should pass". A gate you could not run on this OS is `NOT RUN (reason)`, not "N/A".

## Steps

1. Branch from fresh upstream main: `git fetch upstream && git switch -c <type>/<slug> upstream/main`.
2. TDD (CLAUDE.md rule 5). Run `pnpm verify` before every commit, never after it.
3. **Tier A, always local:** L1, L2 or `pnpm verify`, L3, L5, and L16 from the table below.
4. **Tier B, local, routed by the files touched:** use [gates.md](./gates.md) section 1. If unsure, or if the path matches no row, run them all.
5. **Tier C, fork qualification, required for any change outside `docs/` and `*.md`:** push the branch to your fork, then `gh workflow run ci.yml -R <you>/reticle --ref <branch>`. Wait for every job. Re-run a red job once to classify it. Never fix a red by re-running.
6. Put the SHA, the fork run URL, and the ledger rows in the PR body. Any NOT RUN gate must give its reason.
7. After a rebase or any new commit, Tier A and the fork run are stale. Repeat steps 3 to 6 on the final SHA.
8. Open the upstream PR only when Tier C is fully green, or every red is classified FLAKE with an existing issue linked.

`workflow_dispatch` on `ci.yml` sets every tier to true (13 Linux and 13 Windows install cells, bench, windows, rust, desktop). That is the only way to run Windows, Linux-native clippy, and `install.ps1` parse from a fork. Never dispatch `publish.yml` or `publish-crate.yml` on a fork.

Actions are off on forks by default. A `push` to a branch does not always start CI. Confirm with `gh workflow list -R <you>/reticle` and a `workflow_dispatch`.

## Local commands (macOS arm64)

e2e, conformance, and bench all bind port 8787. Run them sequentially. Use `-sTCP:LISTEN` when freeing ports; a bare `lsof -ti` also kills the MCP proxy.

Set `RETICLE_TELEMETRY=0` and `CI=true` (not `CI=1`: Tauri's CLI rejects a non-boolean `--ci`).

| Id | Gate (CI job) | Exact local command | Notes |
| --- | --- | --- | --- |
| L1 | format-check | `pnpm format:check` |  |
| L2 | verify (CI form) | `node scripts/check-boundaries.mjs --self-test && node scripts/check-lossy-transforms.mjs --self-test && pnpm build && pnpm lint && pnpm lint:docs && pnpm typecheck && node scripts/check-js-audit.mjs --self-test && node scripts/check-js-audit.mjs` | `pnpm verify` omits lint:docs, the self-tests, and the audit |
| L3 | unit-tests | `pnpm build && TURBO_LOG_ORDER=stream pnpm test:unit` | re-run once with `--force` after a file move |
| L4 | macos | the vitest file list in `ci.yml` (Platform surface step), then `RETICLE_TELEMETRY=0 node apps/e2e/specs/daemon-lifecycle-test.mjs && RETICLE_TELEMETRY=0 node apps/e2e/specs/mcp-survives-test.mjs` |  |
| L5 | matrix-records | `pnpm matrix:validate && pnpm gate:soak:self-check` |  |
| L6 | multi-agent | `pnpm gate:multi:self-test && pnpm gate:multi` |  |
| L7 | smoke | `pnpm test:smoke` | evidence in `artifacts/smoke/` |
| L8 | e2e, part 1 | `pnpm test:integration` | CI runs this; local `test:e2e` does not |
| L9 | e2e, part 2 | `pnpm test:e2e` | not sharded, no retries |
| L10 | desktop-e2e | `pnpm test:e2e:desktop` | macOS uses WKWebView, not CI's WebKitGTK |
| L11 | conformance | `pnpm gate:conformance:self-test && pnpm gate:conformance` |  |
| L12 | install-gate | `pnpm gate:install --with-self-test` | all 13 scaffolds |
| L13 | rust | `cd adapters/realm/tauri && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo audit` | Linux clippy is NOT RUN on a Mac |
| L14 | package-quality | the publint and attw loops in `package-quality.yml`, then `pnpm check:pack-size` |  |
| L15 | break | `sh -n install/install.sh`; ASCII check; the three `init` refusal steps in `ci.yml` `early-gates`; `node break/break-matrix.mjs` |  |
| L16 | dco / changelog-policy | `git rev-list --no-merges upstream/main..HEAD` has sign-off; `CHANGELOG.md` is not in the diff |  |
| L17 | bench | `pnpm bench:full && pnpm bench:gate` | after merge CI uses `--full`; the queue uses replay-only `pnpm bench && pnpm bench:gate` |

## Ledger row

```
| date | sha | os/arch | where (local/fork run URL) | gate | exact command | attempt | exit | result (PASS/FAIL/FLAKE/NOT RUN) | class | log path | note |
```

## Red classes

| Class | Meaning | Evidence required |
| --- | --- | --- |
| REAL | the code is wrong | fails on every attempt on the same tree, and the failing assertion is named |
| FLAKE | non-determinism | the same tree goes red and then green; keep each attempt's log |
| ENV | the machine or runner is wrong | it passes after the environment fix, with no code change |
| GATE-WRONG | the gate itself lies | a deliberately broken input that the gate still passes |
| ROUTING | the gate did not run when it should have | the path changed while the job reported `skipped` |

"Flaky" requires the same tree to go red and then green, at least 3 runs. "Fixed" requires the failing condition to be reproduced first, then shown gone in at least 3 runs.

What must be green to merge is in [MERGE-STANDARD.md](../.github/MERGE-STANDARD.md).
