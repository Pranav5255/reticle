/**
 * Fill the generated last-verified table in docs/gates.md from a JSON ledger.
 *
 * The handwritten table in section 0 stays. This block is the machine-readable
 * half so a date cannot sit still while the commands move.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const GATES = join(REPO, 'docs', 'gates.md');
const ROWS = join(HERE, 'gates-last-verified.json');
const START = '<!-- last-verified:generated:start -->';
const END = '<!-- last-verified:generated:end -->';

export function render(rows) {
  const lines = [START, '| check | last verified | result | sha |', '| --- | --- | --- | --- |'];
  for (const row of rows) {
    lines.push(`| \`${row.check}\` | ${row.date} | ${row.result} | \`${row.sha}\` |`);
  }
  lines.push(END);
  return `${lines.join('\n')}\n`;
}

function main() {
  const rows = JSON.parse(readFileSync(ROWS, 'utf8'));
  if (!Array.isArray(rows) || 0 === rows.length) {
    console.error('gates-last-verified.json is empty');
    process.exitCode = 1;
    return;
  }
  const doc = readFileSync(GATES, 'utf8');
  const start = doc.indexOf(START);
  const end = doc.indexOf(END);
  if (-1 === start || -1 === end || end < start) {
    console.error('docs/gates.md is missing the last-verified markers');
    process.exitCode = 1;
    return;
  }
  const next = `${doc.slice(0, start)}${render(rows).trimEnd()}\n${doc.slice(end + END.length)}`;
  writeFileSync(GATES, next);
  console.log(`updated ${rows.length} last-verified rows`);
}

process.exitCode = 0;
main();
