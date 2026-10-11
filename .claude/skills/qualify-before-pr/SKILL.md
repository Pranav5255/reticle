---
name: qualify-before-pr
description: Use before opening any PR, or claiming a branch is green.
---

# Qualify before a PR

Follow the tiers in `docs/pre-pr-qualification.md`. A claim of green needs ledger rows for the final SHA.

1. Run the local commands that apply to the diff (`pnpm verify` at minimum).
2. Dispatch on the fork only: `gh workflow run ci.yml -R Pranav5255/reticle --ref <branch>`.
3. Never `git push` to `upstream` (`reticlehq/reticle`). Never open a PR against it. Never dispatch `publish.yml` or `publish-crate.yml`.
4. Branch names must not contain `froncort`. Use `feature-pranav/<slug>`.
5. Refuse to say "green" if a gate is skipped, `0 tests`, or NOT MEASURED.

Ledger: one row per gate that ran, including NOT RUN with the reason.
