/**
 * Every root `gate:` / `test:` script is invoked by a `gate.needs` job, or excused.
 *
 * Incident: local `pnpm test:e2e` omitted `test:integration`, and main went red after three
 * local greens. A name-to-job map that never reads the job body is the same hole.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');

function rootGateScripts(manifest) {
  return Object.keys(manifest.scripts ?? {})
    .filter((name) => /^(gate:|test:)/.test(name))
    .sort();
}

function gateNeeds(yml) {
  const block = /  gate:\n(?:.*\n)*?    needs:\s*\[([^\]]+)\]/.exec(yml);
  if (null === block || undefined === block[1]) return [];
  return block[1]
    .split(',')
    .map((part) => part.trim())
    .filter((part) => 0 < part.length);
}

/** Job body from the first `  name:` to the next job at indent 2. */
export function jobBody(yml, job) {
  const start = yml.indexOf(`\n  ${job}:\n`);
  if (-1 === start) return '';
  const from = start + 1;
  const rest = yml.slice(from + `  ${job}:\n`.length);
  const next = rest.search(/\n  [A-Za-z][\w-]*:\n/);
  return -1 === next ? yml.slice(from) : yml.slice(from, from + `  ${job}:\n`.length + next);
}

export function jobInvokes(yml, job, script, command, needles = []) {
  const body = jobBody(yml, job);
  if ('' === body) return false;
  if (body.includes(`pnpm ${script}`)) return true;
  if ('string' === typeof command && 0 < command.length && body.includes(command)) return true;
  return needles.some((needle) => body.includes(needle));
}

export function unaccountedScripts(manifest, yml, mapped, excuses, needles = {}) {
  const jobs = new Set(gateNeeds(yml));
  const missing = [];
  for (const script of rootGateScripts(manifest)) {
    if (undefined !== excuses[script]) continue;
    const job = mapped[script];
    if ('string' !== typeof job || !jobs.has(job)) {
      missing.push(script);
      continue;
    }
    const command = manifest.scripts?.[script];
    if (!jobInvokes(yml, job, script, command, needles[script] ?? [])) {
      missing.push(`${script} (job ${job} does not run it)`);
    }
  }
  return missing;
}

function load() {
  const manifest = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));
  const yml = readFileSync(join(REPO, '.github', 'workflows', 'ci.yml'), 'utf8');
  const mapped = JSON.parse(readFileSync(join(HERE, 'script-jobs.json'), 'utf8'));
  const excuses = JSON.parse(readFileSync(join(HERE, 'script-excuses.json'), 'utf8'));
  const needles = JSON.parse(readFileSync(join(HERE, 'script-needles.json'), 'utf8'));
  return { manifest, yml, mapped, excuses, needles };
}

function main(argv) {
  const { manifest, yml, mapped, excuses, needles } = load();
  if (argv.includes('--self-test')) {
    const planted = structuredClone(manifest);
    planted.scripts['test:zz-probe'] = 'echo planted';
    const missing = unaccountedScripts(planted, yml, mapped, excuses, needles);
    if (!missing.includes('test:zz-probe')) {
      console.error('self-test: planted test:zz-probe was accepted');
      return 1;
    }
    const live = unaccountedScripts(manifest, yml, mapped, excuses, needles);
    if (0 !== live.length) {
      console.error('self-test: live tree is unaccounted:');
      for (const name of live) console.error(`  ${name}`);
      return 1;
    }
    console.log('self-test: planted test:zz-probe is red; live tree is green');
    return 0;
  }
  const missing = unaccountedScripts(manifest, yml, mapped, excuses, needles);
  if (0 < missing.length) {
    console.error('root gate/test scripts with no invoking CI job and no excuse:');
    for (const name of missing) console.error(`  ${name}`);
    return 1;
  }
  console.log('root gate/test scripts: each job runs the script, or has an excuse');
  return 0;
}

process.exitCode = main(process.argv.slice(2));
