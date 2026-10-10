/**
 * diff — what changed between two compilations?
 *
 * Compile the same sources for two different tasks (or the same task against
 * two source sets) and see exactly what entered, what left, what changed
 * support, and what became UNKNOWN. Diffs are how agents notice that their
 * grounds moved.
 */

import type { Capsule, DiffLine, Item, CompileOptions } from './types.js';
import { compile } from './compile.js';

interface Entry {
  subject: string;
  content: string;
  support: string;
  section: 'KNOWN' | 'UNCERTAIN' | 'UNKNOWN';
}

function entries(capsule: Capsule): Map<string, Entry> {
  const map = new Map<string, Entry>();
  for (const k of capsule.known) map.set(k.subject, { subject: k.subject, content: k.content, support: k.support, section: 'KNOWN' });
  for (const u of capsule.uncertain) map.set(u.subject, { subject: u.subject, content: u.content, support: u.support, section: 'UNCERTAIN' });
  for (const u of capsule.unknown) map.set(u.subject, { subject: u.subject, content: u.content, support: 'UNKNOWN', section: 'UNKNOWN' });
  return map;
}

export function diffCapsules(a: Capsule, b: Capsule): { lines: DiffLine[]; summary: string } {
  const ea = entries(a);
  const eb = entries(b);
  const lines: DiffLine[] = [];

  for (const subject of new Set([...ea.keys(), ...eb.keys()])) {
    const left = ea.get(subject);
    const right = eb.get(subject);
    if (!left && right) {
      lines.push(
        right.section === 'UNKNOWN'
          ? { marker: '?', subject, detail: `${subject} now UNKNOWN in B` }
          : { marker: '+', subject, detail: `${right.content}  (${right.support})` },
      );
    } else if (left && !right) {
      lines.push({ marker: '-', subject, detail: `${left.content}  (present only in A)` });
    } else if (left && right) {
      if (left.section === 'UNKNOWN' && right.section !== 'UNKNOWN') {
        lines.push({ marker: '!', subject, detail: `resolved in B: ${right.content}  (${right.support})` });
      } else if (left.section !== 'UNKNOWN' && right.section === 'UNKNOWN') {
        lines.push({ marker: '?', subject, detail: `${subject} became UNKNOWN in B` });
      } else if (left.content !== right.content) {
        lines.push({ marker: '→', subject, detail: `${left.content} → ${right.content}` });
      } else if (left.support !== right.support) {
        lines.push({ marker: '→', subject, detail: `${left.content}  (support ${left.support} → ${right.support})` });
      }
    }
  }

  lines.sort((x, y) => (x.subject < y.subject ? -1 : x.subject > y.subject ? 1 : 0));
  const counts = { add: 0, rem: 0, chg: 0, unk: 0, res: 0 };
  for (const l of lines) {
    if (l.marker === '+') counts.add += 1;
    else if (l.marker === '-') counts.rem += 1;
    else if (l.marker === '→') counts.chg += 1;
    else if (l.marker === '?') counts.unk += 1;
    else if (l.marker === '!') counts.res += 1;
  }
  const summary = `+${counts.add}  -${counts.rem}  →${counts.chg}  ?${counts.unk}  !${counts.res}`;
  return { lines, summary };
}

export function diff(
  items: Item[],
  optionsA: CompileOptions,
  optionsB: CompileOptions,
): { lines: DiffLine[]; summary: string; capsuleA: Capsule; capsuleB: Capsule } {
  const capsuleA = compile(items, optionsA);
  const capsuleB = compile(items, optionsB);
  const { lines, summary } = diffCapsules(capsuleA, capsuleB);
  return { lines, summary, capsuleA, capsuleB };
}

export function renderDiff(header: string, result: { lines: DiffLine[]; summary: string }): string {
  const out: string[] = [];
  out.push(`CAPSULE DIFF  ${header}`);
  out.push(`legend: + added   - removed   → changed   ? now unknown   ! resolved`);
  out.push('');
  for (const l of result.lines) {
    out.push(`${l.marker} ${l.subject}`);
    out.push(`    ${l.detail}`);
  }
  out.push('');
  out.push(result.summary);
  return out.join('\n');
}
