/**
 * Flake suppressions expire. An entry past `expires` fails this check.
 *
 * Incident: a skip left in place after the flake died kept hiding a real red. Thirty days
 * is the default window; extend the date in `.github/flaky.json` only with a reason.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_FILE = join(HERE, '..', '..', '.github', 'flaky.json');

/**
 * @param {string} text
 * @param {string} today YYYY-MM-DD
 * @returns {string[]}
 */
export function expiredEntries(text, today) {
  const parsed = JSON.parse(text);
  const entries = parsed.entries;
  if (!Array.isArray(entries)) throw new Error('flaky.json: entries must be an array');
  const stale = [];
  for (const entry of entries) {
    if ('object' !== typeof entry || null === entry) continue;
    const expires = entry.expires;
    const id = 'string' === typeof entry.id ? entry.id : JSON.stringify(entry);
    if ('string' !== typeof expires) {
      stale.push(`${id}: missing expires`);
      continue;
    }
    if ('string' !== typeof entry.issue || '' === entry.issue) {
      stale.push(`${id}: missing issue`);
    }
    if (expires < today) stale.push(`${id}: expired ${expires}`);
  }
  return stale;
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function main(argv) {
  if (argv.includes('--self-test')) {
    const planted = expiredEntries(
      JSON.stringify({
        entries: [{ id: 'planted-expired', expires: '2020-01-01', issue: '1' }],
      }),
      '2026-10-11',
    );
    if (0 === planted.length) {
      console.error('self-test: expired entry was accepted');
      return 1;
    }
    const noIssue = expiredEntries(
      JSON.stringify({ entries: [{ id: 'no-issue', expires: '2099-01-01' }] }),
      '2026-10-11',
    );
    if (0 === noIssue.length) {
      console.error('self-test: missing issue was accepted');
      return 1;
    }
    const fresh = expiredEntries(
      JSON.stringify({
        entries: [{ id: 'still-open', expires: '2099-01-01', issue: '2' }],
      }),
      '2026-10-11',
    );
    if (0 !== fresh.length) {
      console.error('self-test: future expiry was rejected');
      return 1;
    }
    console.log('self-test: expiry red then green');
    return 0;
  }

  const stale = expiredEntries(readFileSync(DEFAULT_FILE, 'utf8'), todayUtc());
  if (0 < stale.length) {
    console.error('flaky.json has expired entries:');
    for (const line of stale) console.error(`  ${line}`);
    return 1;
  }
  console.log('flaky.json: no expired entries');
  return 0;
}

process.exitCode = main(process.argv.slice(2));
