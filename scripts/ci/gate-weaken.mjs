/**
 * Flag a diff that weakens the merge path.
 *
 * Incident: CI judged a PR with the same PR's loosened gate (a new flaky.json
 * entry, a dropped gate.needs job, a re-recorded baseline). Advisory only:
 * writes a step-summary block. CODEOWNERS is the enforcement.
 */
import { appendFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEAKEN = [
  /^\.github\/flaky\.json$/,
  /^scripts\/ci\/script-excuses\.json$/,
  /^scripts\/ci\/tier-patterns\.json$/,
  /^\.github\/workflows\/ci\.yml$/,
  /^apps\/e2e\/install-baseline\.json$/,
  /^bench\/.*baseline/,
];

export function weakeningPaths(paths) {
  return paths.filter((path) => WEAKEN.some((pattern) => pattern.test(path)));
}

function main(argv, stdin) {
  const paths = stdin
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => 0 < line.length);
  const hits = weakeningPaths(paths);
  const dest = process.env.GITHUB_OUTPUT;
  const line = `touches_gates=${0 < hits.length}\n`;
  if (undefined !== dest && '' !== dest) appendFileSync(dest, line);
  else process.stdout.write(line);
  if (0 === hits.length) return 0;
  const body = [
    '### Gate machinery changed',
    '',
    'This diff touches files that decide what CI requires. A reviewer should read them.',
    '',
    ...hits.map((path) => `- \`${path}\``),
    '',
  ].join('\n');
  const step = process.env.GITHUB_STEP_SUMMARY;
  if (undefined !== step && '' !== step) appendFileSync(step, `${body}\n`);
  else process.stdout.write(body);
  return 0;
}

const invoked =
  undefined !== process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (invoked) {
  process.exitCode = main(process.argv.slice(2), readFileSync(0, 'utf8'));
}
