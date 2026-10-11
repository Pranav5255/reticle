#!/usr/bin/env bash
# Advisory: print which contributor skill to load. Never blocks, never edits.
set -eu
input="$(cat || true)"
path="$(printf '%s' "$input" | tr '"' '\n' | grep -E '\.(yml|yaml|json)$|pnpm-workspace\.yaml' | head -n 1 || true)"
cmd="$(printf '%s' "$input" | tr '"' '\n' | grep -E 'gh pr create|git push' | head -n 1 || true)"
if printf '%s' "$input" | grep -Eq '\.github/workflows/'; then
  echo "Load .claude/skills/edit-ci-workflow/SKILL.md"
fi
if printf '%s' "$input" | grep -Eq 'package\.json|pnpm-workspace\.yaml|adapters/|apps/'; then
  echo "Load .claude/skills/wire-into-gates/SKILL.md"
fi
if [ -n "${cmd}" ]; then
  echo "Load .claude/skills/qualify-before-pr/SKILL.md; the PR body needs evidence for HEAD"
fi
exit 0
