/**
 * Every workspace package is a key in scripts/ci/tier-map.json.
 *
 * Incident: a new adapters/realm package matched the coarse `adapters/` prefix so the
 * fail-safe stayed off, and no tier that actually compiles or boots that realm turned on.
 * The map is the long-term replacement for those prefixes; a package missing from it is
 * the same hole, written down one file later.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { REPO_ROOT } from '@/machine/repo-root.js';

const MAP = join(REPO_ROOT, 'scripts', 'ci', 'tier-map.json');

const FIXED = new Set([
  'open-verification',
  'engine',
  'core',
  'server',
  'init',
  'spec-runner',
  'conformance',
]);

function isWorkspaceDir(dir: string): boolean {
  if (FIXED.has(dir)) return true;
  if (/^adapters\/[^/]+\/[^/]+$/.test(dir)) return true;
  if (/^apps\/examples\/[^/]+$/.test(dir)) return true;
  if (/^apps\/[^/]+$/.test(dir) && !dir.startsWith('apps/examples')) return true;
  return false;
}

function workspaceNames(): string[] {
  const files = execFileSync(
    'git',
    [
      'ls-files',
      '--cached',
      '--others',
      '--exclude-standard',
      '--',
      '*package.json',
      '**/package.json',
    ],
    {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    },
  )
    .split('\n')
    .filter((line) => line.endsWith('package.json') && !line.includes('node_modules'));
  const names: string[] = [];
  for (const file of files) {
    const dir = dirname(file);
    if ('.' === dir || !isWorkspaceDir(dir)) continue;
    const body = JSON.parse(readFileSync(join(REPO_ROOT, file), 'utf8')) as { name?: string };
    if ('string' === typeof body.name) names.push(body.name);
  }
  return [...new Set(names)].sort();
}

describe('tier-map.json names every workspace package', () => {
  it('has a map', () => {
    const map = JSON.parse(readFileSync(MAP, 'utf8')) as Record<string, unknown>;
    expect(Object.keys(map).length).toBeGreaterThan(10);
  });

  it('accounts for every workspace package and nothing else', () => {
    const map = JSON.parse(readFileSync(MAP, 'utf8')) as Record<string, unknown>;
    const named = workspaceNames();
    expect(named.length).toBeGreaterThan(10);
    expect(
      named.filter((name) => !(name in map)),
      'add each missing workspace package to scripts/ci/tier-map.json',
    ).toEqual([]);
    expect(
      Object.keys(map).filter((name) => !named.includes(name)),
      'these keys are not workspace packages; drop them from tier-map.json',
    ).toEqual([]);
  });
});
