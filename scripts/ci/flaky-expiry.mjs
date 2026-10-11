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
function entriesOf(text) {
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed.entries)) throw new Error('flaky.json: entries must be an array');
  return parsed.entries;
}

export function expiredEntries(text, today) {
  const stale = [];
  for (const entry of entriesOf(text)) {
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

/** True when `id` matches a current, issue-linked quarantine (by `id` or `job_or_test`). */
export function isQuarantined(text, id, today) {
  return entriesOf(text).some((entry) => {
    if ('object' !== typeof entry || null === entry) return false;
    const name = entry.id === id || entry.job_or_test === id;
    return (
      name &&
      'string' === typeof entry.expires &&
      entry.expires >= today &&
      'string' === typeof entry.issue &&
      '' !== entry.issue
    );
  });
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
    const body = JSON.stringify({
      entries: [
        { id: 'e2e', job_or_test: 'e2e', expires: '2099-01-01', issue: '3' },
        { id: 'old', job_or_test: 'integration', expires: '2020-01-01', issue: '4' },
      ],
    });
    if (!isQuarantined(body, 'e2e', '2026-10-11') || isQuarantined(body, 'integration', '2026-10-11')) {
      console.error('self-test: quarantine allow/deny was wrong');
      return 1;
    }
    console.log('self-test: expiry red then green');
    return 0;
  }

  const allowsAt = argv.indexOf('--allows');
  if (-1 !== allowsAt) {
    const id = argv[allowsAt + 1];
    if ('string' !== typeof id || '' === id) {
      console.error('usage: flaky-expiry.mjs --allows <id>');
      return 1;
    }
    if (!isQuarantined(readFileSync(DEFAULT_FILE, 'utf8'), id, todayUtc())) {
      console.error(`unquarantined: ${id}`);
      return 1;
    }
    console.log(`quarantined: ${id}`);
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
