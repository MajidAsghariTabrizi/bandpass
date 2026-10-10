/**
 * Capsule assembly and rendering.
 *
 * A Context Capsule is a compact, inspectable, provenance-aware packet
 * containing only the information an agent should receive for the current
 * task — plus an explicit record of what was rejected and why.
 */

import type { Capsule, CapsuleStats, ExclusionRecord, SelectedItem, SupersededRecord } from './types.js';
import { estimateTokens } from './tokens.js';

export function buildCapsule(input: {
  task: string;
  agent?: string;
  budget: number;
  known: SelectedItem[];
  uncertain: SelectedItem[];
  unknown: SelectedItem[];
  superseded: SupersededRecord[];
  excluded: ExclusionRecord[];
  stats: CapsuleStats;
}): Capsule {
  const capsule: Capsule = {
    schema: 'bandpass.capsule/v1',
    task: input.task,
    agent: input.agent,
    budget_tokens: input.budget,
    used_tokens: 0,
    known: input.known,
    uncertain: input.uncertain,
    unknown: input.unknown,
    superseded: input.superseded,
    excluded: input.excluded,
    stats: input.stats,
  };
  capsule.used_tokens = estimateTokens(renderAgentContext(capsule));
  return capsule;
}

/**
 * The part of the capsule the agent actually receives: header + KNOWN +
 * UNCERTAIN + UNKNOWN + MISSION. The SUPERSEDED register and the rejection
 * ledger are inspection surfaces — they do not consume the agent's budget.
 */
export function renderAgentContext(capsule: Capsule): string {
  const inspectionOnly: Capsule = { ...capsule, superseded: [], excluded: [] };
  return renderCapsule(inspectionOnly);
}

function itemLines(item: SelectedItem): string {
  const lines = [`  ${item.kind === 'unknown' ? '?' : item.note ? '~' : '✓'} ${item.content}`];
  const meta: string[] = [`source: ${item.source}`];
  if (item.kind !== 'unknown') {
    meta.push(`support: ${item.support}`);
    meta.push(`relevance: ${item.relevance.toFixed(2)}`);
    meta.push(`evidence: ${item.evidence}`);
  } else {
    meta.push(`relevance: ${item.relevance.toFixed(2)}`);
  }
  lines.push(`    ${meta.join('   ')}`);
  if (item.supersedes_summary) {
    lines.push(`    supersedes: ${item.supersedes_summary}`);
  }
  if (item.note) {
    lines.push(`    note: ${item.note}`);
  }
  return lines.join('\n');
}

export function renderCapsule(capsule: Capsule): string {
  const out: string[] = [];
  out.push('CONTEXT CAPSULE  bandpass/v1');
  out.push(`TASK        ${capsule.task}`);
  if (capsule.agent) out.push(`AGENT       ${capsule.agent}`);
  out.push(`BUDGET      ${capsule.budget_tokens} tokens (estimated)   USED ${capsule.used_tokens}`);

  if (capsule.known.length > 0) {
    out.push('');
    out.push(`KNOWN (${capsule.known.length})`);
    for (const item of capsule.known) out.push(itemLines(item));
  }

  if (capsule.uncertain.length > 0) {
    out.push('');
    out.push(`UNCERTAIN (${capsule.uncertain.length})`);
    for (const item of capsule.uncertain) out.push(itemLines(item));
  }

  if (capsule.unknown.length > 0) {
    out.push('');
    out.push(`UNKNOWN (${capsule.unknown.length})`);
    for (const item of capsule.unknown) out.push(itemLines(item));
  }

  if (capsule.superseded.length > 0) {
    out.push('');
    out.push(`SUPERSEDED (${capsule.superseded.length}) — out of context, recorded for inspection`);
    for (const s of capsule.superseded) {
      out.push(`  × ${s.content}`);
      out.push(`    ${s.reason}: ${s.winner_content}  (${s.winner_id})`);
    }
  }

  const mission = [...capsule.known, ...capsule.uncertain].find((i) => i.kind === 'mission');
  if (mission) {
    out.push('');
    out.push('MISSION');
    out.push(`  ▸ ${mission.content}`);
  }

  return out.join('\n');
}

/** The rejection ledger — bandpass's most important panel. */
export function renderExclusions(capsule: Capsule): string {
  const out: string[] = [];
  out.push(`REJECTED (${capsule.excluded.length})`);
  for (const e of capsule.excluded) {
    out.push(`  × [${e.stage}] ${e.id}: ${truncate(e.content, 64)}`);
    out.push(`    reason: ${e.reason} — ${e.detail}`);
  }
  return out.join('\n');
}

export function renderStats(capsule: Capsule): string {
  const s = capsule.stats;
  return [
    `collected     ${s.collected}`,
    `relevant      ${s.relevant}`,
    `verified      ${s.verified}`,
    `conflicts     ${s.conflicts}`,
    `superseded    ${s.superseded}`,
    `duplicates    ${s.duplicates}`,
    `selected      ${s.selected}`,
    `rejected      ${s.rejected}`,
  ].join('\n');
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
