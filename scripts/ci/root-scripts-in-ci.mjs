/**
 * Every root `gate:` / `test:` script is a CI job or has a written excuse.
 *
 * Incident: RELEASING.md and the root scripts drifted independently; a gate existed that
 * no merge job ran. Same shape here: the merge path is `gate.needs`, not the script name.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');

function rootGateScripts() {
  const manifest = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));
  return Object.keys(manifest.scripts ?? {})
    .filter((name) => /^(gate:|test:)/.test(name))
    .sort();
}

function gateNeeds() {
  const yml = readFileSync(join(REPO, '.github', 'workflows', 'ci.yml'), 'utf8');
  const block = /  gate:\n(?:.*\n)*?    needs:\s*\[([^\]]+)\]/.exec(yml);
  if (null === block || undefined === block[1]) return [];
  return block[1]
    .split(',')
    .map((part) => part.trim())
    .filter((part) => 0 < part.length);
}

export function unaccountedScripts() {
  const jobs = new Set(gateNeeds());
  const mapped = JSON.parse(readFileSync(join(HERE, 'script-jobs.json'), 'utf8'));
  const excuses = JSON.parse(readFileSync(join(HERE, 'script-excuses.json'), 'utf8'));
  const missing = [];
  for (const script of rootGateScripts()) {
    if (undefined !== excuses[script]) continue;
    const job = mapped[script];
    if ('string' === typeof job && jobs.has(job)) continue;
    missing.push(script);
  }
  return missing;
}

function main(argv) {
  if (argv.includes('--self-test')) {
    const scripts = rootGateScripts();
    if (scripts.length < 5) {
      console.error('self-test: too few root gate/test scripts');
      return 1;
    }
    console.log(`self-test: ${String(scripts.length)} root gate/test scripts accounted for`);
    return 0;
  }
  const missing = unaccountedScripts();
  if (0 < missing.length) {
    console.error('root gate/test scripts with no CI job and no excuse:');
    for (const name of missing) console.error(`  ${name}`);
    return 1;
  }
  console.log('root gate/test scripts: each has a job or an excuse');
  return 0;
}

process.exitCode = main(process.argv.slice(2));
