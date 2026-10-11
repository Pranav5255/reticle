#!/usr/bin/env bash
# Hard deny for agent shell: do not git push to reticlehq/reticle.
set -eu
input="$(cat || true)"
printf '%s' "$input" | grep -Eqi 'git[[:space:]]+push.*(upstream|git@github\.com:reticlehq/reticle|https://github\.com/reticlehq/reticle)' || exit 0
echo '{"decision":"block","reason":"do not push to reticlehq/reticle; origin/fork only"}'
exit 0
