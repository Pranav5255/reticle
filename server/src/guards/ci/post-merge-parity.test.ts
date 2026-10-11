/**
 * A job that can run on push to main must be able to run on merge_group.
 *
 * Incident: about 18 of the last 30 pushes to main were red on jobs the queue
 * never ran. `skipped` on those jobs counted as green for `gate`. The only
 * exceptions are side-effect jobs (NOT_A_GATE) and an expiring flaky.json entry.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { REPO_ROOT } from '@/machine/repo-root.js';

const WORKFLOW = join(REPO_ROOT, '.github', 'workflows', 'ci.yml');
const FLAKY = join(REPO_ROOT, '.github', 'flaky.json');

const SIDE_EFFECT = new Set(['gate', 'fixtures-dispatch', 'nightly-watch']);

function jobIf(body: unknown): string {
  if ('object' !== typeof body || null === body || !('if' in body)) return '';
  const value = (body as { if?: unknown }).if;
  return 'string' === typeof value ? value : '';
}

function quarantinedJobs(): string[] {
  const parsed = JSON.parse(readFileSync(FLAKY, 'utf8')) as {
    entries?: { job_or_test?: string; expires?: string }[];
  };
  const today = new Date().toISOString().slice(0, 10);
  return (parsed.entries ?? [])
    .filter((entry) => 'string' === typeof entry.job_or_test && 'string' === typeof entry.expires)
    .filter((entry) => (entry.expires ?? '') >= today)
    .map((entry) => entry.job_or_test as string);
}

describe('post-merge jobs can also run pre-merge', () => {
  it('no push-only job is missing from merge_group unless quarantined', () => {
    const parsed = parse(readFileSync(WORKFLOW, 'utf8')) as { jobs?: Record<string, unknown> };
    const jobs = parsed.jobs ?? {};
    const allowed = new Set([...SIDE_EFFECT, ...quarantinedJobs()]);
    const pushOnly = Object.entries(jobs)
      .filter(([name, body]) => {
        if (allowed.has(name)) return false;
        const condition = jobIf(body);
        if (!condition.includes('push')) return false;
        return !condition.includes('merge_group');
      })
      .map(([name]) => name);
    expect(
      pushOnly,
      'these jobs run on push to main but cannot run on merge_group. Add merge_group to the if:, or an expiring flaky.json entry with an issue',
    ).toEqual([]);
  });
});
