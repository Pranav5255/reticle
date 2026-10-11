/**
 * Flake suppressions expire, and every one names an issue.
 *
 * Incident: a skip left in place after the flake died kept hiding a real red. Thirty days
 * is the default window; extend the date in `.github/flaky.json` only with a reason.
 *
 * An EXPIRED entry fails only where somebody can act on it: the nightly, a manual run, or a
 * pull request that edits `.github/flaky.json`. On every other pull request it is a warning,
 * so a calendar date never turns an unrelated contributor's PR red. A MALFORMED entry (no
 * issue, no expiry) always fails, because only an edit to the file can produce one.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_FILE = join(HERE, '..', '..', '.github', 'flaky.json');

/** Events where an expired entry is an error rather than a warning. */
const STRICT_EVENTS = new Set(['schedule', 'workflow_dispatch']);

function entriesOf(text) {
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed.entries)) throw new Error('flaky.json: entries must be an array');
  return parsed.entries;
}

function idOf(entry) {
  return 'string' === typeof entry.id ? entry.id : JSON.stringify(entry);
}

/**
 * @param {string} text
 * @param {string} today YYYY-MM-DD
 * @returns {{ malformed: string[], expired: string[] }}
 */
export function auditEntries(text, today) {
  const malformed = [];
  const expired = [];
  for (const entry of entriesOf(text)) {
    if ('object' !== typeof entry || null === entry) {
      malformed.push(`${JSON.stringify(entry)}: not an object`);
      continue;
    }
    const id = idOf(entry);
    if ('string' !== typeof entry.expires || '' === entry.expires) {
      malformed.push(`${id}: missing expires`);
      continue;
    }
    if ('string' !== typeof entry.issue || '' === entry.issue)
      malformed.push(`${id}: missing issue`);
    if (entry.expires < today) expired.push(`${id}: expired ${entry.expires}`);
  }
  return { malformed, expired };
}

/**
 * Whether this run fails, and what it prints.
 *
 * @param {string} text
 * @param {string} today YYYY-MM-DD
 * @param {{ event: string, touched: boolean }} context
 * @returns {{ fail: boolean, errors: string[], warnings: string[] }}
 */
export function decide(text, today, context) {
  const { malformed, expired } = auditEntries(text, today);
  const strict = STRICT_EVENTS.has(context.event) || context.touched;
  const errors = [...malformed, ...(strict ? expired : [])];
  const warnings = strict ? [] : expired;
  return { fail: 0 < errors.length, errors, warnings };
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

function argValue(argv, flag) {
  const at = argv.indexOf(flag);
  if (-1 === at) return undefined;
  const value = argv[at + 1];
  return 'string' === typeof value && !value.startsWith('--') ? value : undefined;
}

function selfTest() {
  const today = '2026-10-11';
  const expired = JSON.stringify({ entries: [{ id: 'old', expires: '2020-01-01', issue: '1' }] });
  const noIssue = JSON.stringify({ entries: [{ id: 'no-issue', expires: '2099-01-01' }] });
  const fresh = JSON.stringify({ entries: [{ id: 'open', expires: '2099-01-01', issue: '2' }] });
  const cases = [
    [
      'expired, unrelated PR: warn only',
      decide(expired, today, { event: 'pull_request', touched: false }),
      false,
    ],
    [
      'expired, PR edits the file: fail',
      decide(expired, today, { event: 'pull_request', touched: true }),
      true,
    ],
    ['expired, nightly: fail', decide(expired, today, { event: 'schedule', touched: false }), true],
    [
      'expired, manual run: fail',
      decide(expired, today, { event: 'workflow_dispatch', touched: false }),
      true,
    ],
    [
      'missing issue, unrelated PR: fail',
      decide(noIssue, today, { event: 'pull_request', touched: false }),
      true,
    ],
    [
      'current entry, nightly: pass',
      decide(fresh, today, { event: 'schedule', touched: false }),
      false,
    ],
  ];
  for (const [name, result, shouldFail] of cases) {
    if (result.fail !== shouldFail) {
      console.error(`self-test: ${name}: got fail=${String(result.fail)}`);
      return 1;
    }
  }
  if (0 === decide(expired, today, { event: 'pull_request', touched: false }).warnings.length) {
    console.error('self-test: an expired entry on an unrelated PR printed no warning');
    return 1;
  }
  const body = JSON.stringify({
    entries: [
      { id: 'e2e', job_or_test: 'e2e', expires: '2099-01-01', issue: '3' },
      { id: 'old', job_or_test: 'integration', expires: '2020-01-01', issue: '4' },
    ],
  });
  if (!isQuarantined(body, 'e2e', today) || isQuarantined(body, 'integration', today)) {
    console.error('self-test: quarantine allow/deny was wrong');
    return 1;
  }
  console.log(`self-test: ${String(cases.length)} expiry cases and the quarantine lookup behave`);
  return 0;
}

function main(argv) {
  if (argv.includes('--self-test')) return selfTest();

  const today = argValue(argv, '--today') ?? todayUtc();
  const text = readFileSync(argValue(argv, '--file') ?? DEFAULT_FILE, 'utf8');

  const allows = argValue(argv, '--allows');
  if (argv.includes('--allows')) {
    if (undefined === allows) {
      console.error('usage: flaky-expiry.mjs --allows <id>');
      return 1;
    }
    if (!isQuarantined(text, allows, today)) {
      console.error(`unquarantined: ${allows}`);
      return 1;
    }
    console.log(`quarantined: ${allows}`);
    return 0;
  }

  const result = decide(text, today, {
    event: argValue(argv, '--event') ?? 'pull_request',
    touched: argv.includes('--touched'),
  });
  for (const line of result.warnings) console.log(`::warning::flaky.json: ${line}`);
  if (result.fail) {
    console.error('flaky.json:');
    for (const line of result.errors) console.error(`  ${line}`);
    return 1;
  }
  console.log(`flaky.json: ${String(result.warnings.length)} expired (warned), none failing`);
  return 0;
}

process.exitCode = main(process.argv.slice(2));
