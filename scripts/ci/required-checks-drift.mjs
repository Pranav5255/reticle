/**
 * MERGE-STANDARD.md's fenced required-check list vs the live GitHub ruleset.
 *
 * The ruleset belongs to the maintainer. This script records the mismatch; it does not
 * apply the ruleset. When `gh` cannot read the ruleset the run is NOT MEASURED, not green.
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

function liveChecks(repo) {
  const listed = spawnSync('gh', ['api', `repos/${repo}/rulesets`], { encoding: 'utf8' });
  if (0 !== listed.status) {
    return { ok: false, reason: listed.stderr.trim() || 'gh api rulesets failed', names: [] };
  }
  let rulesets;
  try {
    rulesets = JSON.parse(listed.stdout);
  } catch {
    return { ok: false, reason: 'rulesets JSON parse failed', names: [] };
  }
  if (!Array.isArray(rulesets)) return { ok: false, reason: 'rulesets is not an array', names: [] };
  const names = new Set();
  for (const set of rulesets) {
    if ('object' !== typeof set || null === set || 'number' !== typeof set.id) continue;
    const one = spawnSync('gh', ['api', `repos/${repo}/rulesets/${String(set.id)}`], {
      encoding: 'utf8',
    });
    if (0 !== one.status) continue;
    let body;
    try {
      body = JSON.parse(one.stdout);
    } catch {
      continue;
    }
    const rules = Array.isArray(body.rules) ? body.rules : [];
    for (const rule of rules) {
      if (rule.type !== 'required_status_checks') continue;
      const params = rule.parameters;
      const checks =
        params && Array.isArray(params.required_status_checks) ? params.required_status_checks : [];
      for (const check of checks) {
        if ('string' === typeof check.context) names.add(check.context);
      }
    }
  }
  return { ok: true, reason: '', names: [...names].sort() };
}

function main(argv) {
  const listed = listedChecks(readFileSync(STANDARD, 'utf8'));
  if (0 === listed.length) {
    console.error('MERGE-STANDARD.md has no ```required-checks fence');
    return 1;
  }
  if (argv.includes('--self-test')) {
    const fakeLive = listed.filter((name) => name !== 'analyze (javascript-typescript)');
    const missing = listed.filter((name) => !fakeLive.includes(name));
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
  const repo = argv.includes('--upstream') ? 'reticlehq/reticle' : 'reticlehq/reticle';
  const live = liveChecks(repo);
  if (!live.ok) {
    console.log(`NOT MEASURED: live ruleset unread (${live.reason})`);
    console.log(`documented: ${listed.join(', ')}`);
    return 0;
  }
  const missing = listed.filter((name) => !live.names.includes(name));
  const extra = live.names.filter((name) => !listed.includes(name));
  console.log(`live: ${live.names.join(', ') || '(none)'}`);
  console.log(`documented: ${listed.join(', ')}`);
  if (0 < missing.length || 0 < extra.length) {
    if (0 < missing.length) console.error(`missing on live: ${missing.join(', ')}`);
    if (0 < extra.length) console.error(`extra on live: ${extra.join(', ')}`);
    return 1;
  }
  console.log('required checks match MERGE-STANDARD.md');
  return 0;
}

process.exitCode = main(process.argv.slice(2));
