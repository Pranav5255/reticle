#!/usr/bin/env bash
# Deny pushes whose remote URL is reticlehq/reticle.
# This checkout is a local/fork tree. Upstream is a separate, explicit decision.
set -eu
url="${2:-}"
case "$url" in
  *github.com/reticlehq/reticle*|*github.com:reticlehq/reticle*)
    echo "deny: this checkout does not push to reticlehq/reticle (origin/fork only)"
    exit 1
    ;;
esac
exit 0
