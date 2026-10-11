/**
 * Every `needs:` entry in a workflow must name a job in that file.
 *
 * Incident: a typo (`verfiy`) in `needs` is valid YAML. GitHub then refuses to start the
 * dependent job, after the PR has already been sitting in the queue. This is the pinned
 * no-download stand-in for actionlint used by `format-check`.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKFLOWS = join(HERE, '..', '..', '.github', 'workflows');

/** Job ids at the `jobs:` map (two-space indent). */
export function jobNames(text) {
  const names = [];
  let inJobs = false;
  for (const line of text.split('\n')) {
    if (/^jobs:\s*$/.test(line)) {
      inJobs = true;
      continue;
    }
    if (inJobs && /^[A-Za-z]/.test(line)) break;
    if (!inJobs) continue;
    const match = /^  ([A-Za-z][\w-]*):/.exec(line);
    if (null !== match && undefined !== match[1]) names.push(match[1]);
  }
  return names;
}

/** `needs:` references that do not name a job in the same file. */
export function missingNeeds(text) {
  const names = new Set(jobNames(text));
  if (0 === names.size) return ['<workflow has no jobs>'];
  const missing = [];
  let current = '';
  for (const line of text.split('\n')) {
    const job = /^  ([A-Za-z][\w-]*):/.exec(line);
    if (null !== job && undefined !== job[1] && !line.includes('needs:')) current = job[1];
    const inline =
      /^\s+needs:\s*\[([^\]]*)\]/.exec(line) ?? /^\s+needs:\s+([A-Za-z][\w-]*)\s*$/.exec(line);
    if (null !== inline && undefined !== inline[1]) {
      for (const name of inline[1]
        .split(',')
        .map((part) => part.trim())
        .filter((part) => 0 < part.length)) {
        if (!names.has(name)) missing.push(`${current} needs ${name}`);
      }
    }
  }
  return missing;
}

function checkTree() {
  const stale = [];
  for (const file of readdirSync(WORKFLOWS)) {
    if (!file.endsWith('.yml') && !file.endsWith('.yaml')) continue;
    for (const miss of missingNeeds(readFileSync(join(WORKFLOWS, file), 'utf8'))) {
      stale.push(`.github/workflows/${file}: ${miss}`);
    }
  }
  return stale;
}

const PLANTED = `jobs:
  format-check: {}
  verify:
    needs: [verfiy]
`;

function main(argv) {
  if (argv.includes('--self-test')) {
    const planted = missingNeeds(PLANTED);
    if (!planted.includes('verify needs verfiy')) {
      console.error('self-test: planted verfiy typo was not reported');
      return 1;
    }
    console.log('self-test: planted verfiy typo is red');
    return 0;
  }

  const stale = checkTree();
  if (0 < stale.length) {
    console.error('workflow needs: that do not name a job:');
    for (const line of stale) console.error(`  ${line}`);
    return 1;
  }
  console.log('workflow needs: every referenced job exists');
  return 0;
}

process.exitCode = main(process.argv.slice(2));
