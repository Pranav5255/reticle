/**
 * Path router for ci.yml `changes`.
 *
 * Incident: a new `adapters/realm/<name>/` matched the coarse `adapters/` allowlist so the
 * fail-safe stayed off, while desktop/bench/conformance never turned on. Nightlies on main
 * then ran jobs the PR never ran. Fail-safe is now "this path matched no tier and is not
 * docs-only", and every file under `.github/workflows/` or `scripts/ci/` turns every tier on.
 */
import { appendFileSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PATTERNS = JSON.parse(readFileSync(join(HERE, 'tier-patterns.json'), 'utf8'));

export const TIERS = Object.keys(PATTERNS.tiers);

const compiled = Object.fromEntries(
  Object.entries(PATTERNS.tiers).map(([name, source]) => [name, new RegExp(source)]),
);
const docsOnly = new RegExp(PATTERNS.docsOnly);
const allTiersPrefix = new RegExp(PATTERNS.allTiersPrefix);

/** Every expensive tier on. Used for fail-safe and for workflow/router edits. */
export function allTiersOn() {
  return Object.fromEntries(TIERS.map((name) => [name, true]));
}

/** True when the path is cheap: docs, root markdown, issue templates. */
export function isDocsOnly(path) {
  return docsOnly.test(path);
}

/**
 * Decide which expensive CI tiers a changed-path list turns on.
 *
 * @param {readonly string[]} paths
 * @returns {{ flags: Record<string, boolean>, unrouted: string[] }}
 */
export function route(paths) {
  const flags = Object.fromEntries(TIERS.map((name) => [name, false]));
  const unrouted = [];

  if (paths.some((path) => allTiersPrefix.test(path))) {
    return { flags: allTiersOn(), unrouted: [] };
  }

  for (const path of paths) {
    if (isDocsOnly(path)) continue;
    let hit = false;
    for (const name of TIERS) {
      const pattern = compiled[name];
      if (pattern !== undefined && pattern.test(path)) {
        flags[name] = true;
        hit = true;
      }
    }
    if (!hit) unrouted.push(path);
  }

  if (0 < unrouted.length) {
    return { flags: allTiersOn(), unrouted };
  }
  return { flags, unrouted };
}

/** Markdown table of path -> tiers, for $GITHUB_STEP_SUMMARY. */
export function summaryTable(paths, result) {
  const lines = ['### CI path routing', '', '| path | tiers |', '| --- | --- |'];
  const unrouted = new Set(result.unrouted);
  for (const path of paths) {
    if (unrouted.has(path)) {
      lines.push(`| \`${path}\` | ALL (unrouted) |`);
      continue;
    }
    if (allTiersPrefix.test(path)) {
      lines.push(`| \`${path}\` | ALL (workflow/router) |`);
      continue;
    }
    if (isDocsOnly(path)) {
      lines.push(`| \`${path}\` | (docs-only) |`);
      continue;
    }
    const on = TIERS.filter((name) => result.flags[name] === true && compiled[name].test(path));
    lines.push(`| \`${path}\` | ${0 === on.length ? '(none)' : on.join(', ')} |`);
  }
  if (0 < result.unrouted.length) {
    lines.push('');
    lines.push('unrouted paths (fail-safe: every tier on):');
    for (const path of result.unrouted) lines.push(`- \`${path}\``);
  }
  return `${lines.join('\n')}\n`;
}

function writeGithubOutput(flags) {
  const dest = process.env.GITHUB_OUTPUT;
  const body = `${TIERS.map((name) => `${name}=${flags[name]}`).join('\n')}\n`;
  if (undefined === dest || '' === dest) {
    process.stdout.write(body);
    return;
  }
  appendFileSync(dest, body);
}

function main(argv, stdin) {
  if (argv.includes('--dump-patterns')) {
    for (const [name, source] of Object.entries(PATTERNS.tiers)) {
      process.stdout.write(`${name}=${source}\n`);
    }
    return 0;
  }

  const paths = stdin
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => 0 < line.length);
  const result = route(paths);
  writeGithubOutput(result.flags);
  if (0 < result.unrouted.length) {
    console.log('unrouted paths (fail-safe: every tier on):');
    for (const path of result.unrouted) console.log(`  ${path}`);
  }
  if (argv.includes('--summary')) {
    const table = summaryTable(paths, result);
    const step = process.env.GITHUB_STEP_SUMMARY;
    if (undefined !== step && '' !== step) appendFileSync(step, table);
    else process.stdout.write(table);
  }
  return 0;
}

const invoked =
  undefined !== process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (invoked) {
  const stdin = readFileSync(0, 'utf8');
  process.exitCode = main(process.argv.slice(2), stdin);
}
