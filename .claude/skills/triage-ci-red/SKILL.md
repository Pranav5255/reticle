---
name: triage-ci-red
description: Use when a CI run, merge-queue entry or nightly is red.
---

# Triage a red CI run

1. `gh run view <id> --log-failed`. Find the first failing step.
2. Classify REAL / FLAKE / ENV / GATE-WRONG / ROUTING. A flake needs the same tree red then green, 3 or more runs.
3. Search existing issues before filing.
4. Update `.github/flaky.json` only with an issue and an `expires` date. Never "fix" by re-running.

Ledger: run id, first failing step, class, issue if any.
