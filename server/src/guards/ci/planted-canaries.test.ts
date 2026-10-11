/**
 * Planted canaries stay absent on the merge path.
 *
 * Incident: a gate that has never been seen red is unverified. The red demonstration is
 * `scripts/ci/canaries/<name>` existing; CI fails if that file is present. Plant it on a
 * throwaway branch, record the red, delete it, record the green.
 */
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from '@/machine/repo-root.js';

const CANARIES = join(REPO_ROOT, 'scripts', 'ci', 'canaries');

describe('planted canaries are absent', () => {
  it.each(['bench-red', 'e2e-never-emitted'])('%s is not on the tree', (name) => {
    expect(existsSync(join(CANARIES, name))).toBe(false);
  });
});
