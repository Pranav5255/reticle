/**
 * MERGE-STANDARD.md's fenced required-check list vs the live branch rules.
 *
 * Uses the public `rules/branches/main` endpoint (no admin token). The ruleset
 * belongs to the maintainer. `--advisory` prints a mismatch and exits 0 so a
 * PR is not failed for a settings gap the contributor cannot close.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const STANDARD = join(HERE, '..', '..', '.github', 'MERGE-STANDARD.md');

/** Parse the machine-readable fence in MERGE-STANDARD.md. */
export function listedChecks(markdown) {
  const fence = /```required-checks\n([\s\S]*?)```/.exec(markdown);
  if (null === fence || undefined === fence[1]) return [];
  return fence[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => 0 < line.length && !line.startsWith('#'));
}

function contextsFromRules(rules) {
  const names = new Set();
  if (!Array.isArray(rules)) return names;
  for (const rule of rules) {
    if (!rule || rule.type !== 'required_status_checks') continue;
    const checks = rule.parameters?.required_status_checks;
    if (!Array.isArray(checks)) continue;
    for (const check of checks) {
      if ('string' === typeof check.context) names.add(check.context);
    }
  }
  return names;
}

export function liveChecks(repo) {
  const listed = spawnSync('gh', ['api', `repos/${repo}/rules/branches/main`], {
    encoding: 'utf8',
  });
  if (0 !== listed.status) {
    return {
      ok: false,
      reason: listed.stderr.trim() || 'gh api rules/branches/main failed',
      names: [],
    };
  }
  let body;
  try {
    body = JSON.parse(listed.stdout);
  } catch {
    return { ok: false, reason: 'rules JSON parse failed', names: [] };
  }
  const rules = Array.isArray(body) ? body : Array.isArray(body.rules) ? body.rules : [];
  return { ok: true, reason: '', names: [...contextsFromRules(rules)].sort() };
}

export function drift(listed, liveNames) {
  return {
    missing: listed.filter((name) => !liveNames.includes(name)),
    extra: liveNames.filter((name) => !listed.includes(name)),
  };
}

function main(argv) {
  const listed = listedChecks(readFileSync(STANDARD, 'utf8'));
  if (0 === listed.length) {
    console.error('MERGE-STANDARD.md has no ```required-checks fence');
    return 1;
  }
  if (argv.includes('--self-test')) {
    const fakeLive = listed.filter((name) => name !== 'analyze (javascript-typescript)');
    const { missing } = drift(listed, fakeLive);
    if (!missing.includes('analyze (javascript-typescript)')) {
      console.error('self-test: planted missing analyze was not reported');
      return 1;
    }
    console.log('self-test: planted missing analyze is red');
    return 0;
  }
  if (argv.includes('--list-only')) {
    for (const name of listed) console.log(name);
    return 0;
  }
  const repoIdx = argv.indexOf('--repo');
  const repo = -1 !== repoIdx && argv[repoIdx + 1] ? argv[repoIdx + 1] : 'reticlehq/reticle';
  const live = liveChecks(repo);
  if (!live.ok) {
    console.log(`NOT MEASURED: live rules unread (${live.reason})`);
    console.log(`documented: ${listed.join(', ')}`);
    return argv.includes('--advisory') ? 0 : 1;
  }
  const { missing, extra } = drift(listed, live.names);
  console.log(`live: ${live.names.join(', ') || '(none)'}`);
  console.log(`documented: ${listed.join(', ')}`);
  if (0 < missing.length || 0 < extra.length) {
    if (0 < missing.length) console.error(`missing on live: ${missing.join(', ')}`);
    if (0 < extra.length) console.error(`extra on live: ${extra.join(', ')}`);
    return argv.includes('--advisory') ? 0 : 1;
  }
  console.log('required checks match MERGE-STANDARD.md');
  return 0;
}

process.exitCode = main(process.argv.slice(2));
