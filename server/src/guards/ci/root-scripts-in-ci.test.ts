/**
 * Root `gate:` / `test:` scripts are a CI job or have a written excuse.
 *
 * Same incident as release-gates-are-listed: a script existed that no merge job ran.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { REPO_ROOT } from '@/machine/repo-root.js';

const SCRIPT = join(REPO_ROOT, 'scripts', 'ci', 'root-scripts-in-ci.mjs');

describe('root gate/test scripts are in CI or excused', () => {
  it('exits 0 on this tree', () => {
    const result = execFileSync(process.execPath, [SCRIPT], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    expect(result).toMatch(/each job runs the script, or has an excuse/);
  });
});
