---
name: weaken-a-gate-safely
description: Use when touching flaky.json, script-excuses.json, install or bench baselines, gate.needs, or tier-patterns.json.
---

# Weaken a gate only with a reason

1. Write the reason in the PR body (`baseline-reason:` or a `.changes/` entry).
2. If this is a flake, add a `.github/flaky.json` entry with an issue and an `expires` date at most 30 days out. An unquarantined red is never retried.
3. Do not drop a job from `gate.needs` to make a PR green.
4. Do not narrow `scripts/ci/tier-patterns.json` so a path stops matching unless a replacement route exists.
5. A reviewer who owns `.github/` or `scripts/ci/` must look. CODEOWNERS requests that review.

Ledger: the files touched, the reason, the issue, the expiry.
