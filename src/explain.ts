/**
 * explain — why did this fact enter (or not enter) the context?
 *
 * Trust requires an audit trail. explain() re-runs the deterministic
 * compiler and reports, for one item: its measured relevance, its evidence
 * grade, the resolution outcome on its subject, its budget rank, and the
 * alternatives that lost to it.
 */

import type { CompileOptions, ExplainTrace, Item } from './types.js';
import { compileDetailed, type CompileDetail } from './compile.js';
import { gradeSupport } from './verify.js';

function traceFor(detail: CompileDetail, options: CompileOptions, target: Item): ExplainTrace {
  const { capsule } = detail;
  const ranked = detail.ranked.find((r) => r.item.id === target.id);
  const threshold = options.relevance_threshold ?? 0.15;

  const relevance = {
    score: ranked ? Number(ranked.score.toFixed(2)) : 0,
    lexical_score: ranked?.lexical_score !== undefined ? Number(ranked.lexical_score.toFixed(2)) : undefined,
    stale_days: ranked?.stale_days,
    matched_subject_tokens: ranked?.matched_subject_tokens ?? [],
    matched_content_tokens: ranked?.matched_content_tokens ?? [],
    threshold,
  };

  const selected = [...capsule.known, ...capsule.uncertain, ...capsule.unknown];
  const selectedHit = selected.find((s) => s.id === target.id);
  const excludedHit = capsule.excluded.find((e) => e.id === target.id);
  const supersededHit = capsule.superseded.find((s) => s.id === target.id);

  if (selectedHit && selectedHit.kind === 'unknown') {
    return {
      item: { id: target.id, subject: target.subject, content: target.content },
      decision: 'unknown',
      section: 'UNKNOWN',
      relevance,
      reason: 'unknown about a task-relevant subject — kept explicitly unknown',
    };
  }
  if (selectedHit && selectedHit.note) {
    return {
      item: { id: target.id, subject: target.subject, content: target.content },
      decision: 'uncertain',
      section: 'UNCERTAIN',
      relevance,
      support: { grade: gradeSupport(target), authority: target.authority, evidence: target.evidence },
      reason: `high task relevance with weak evidence — surfaced as UNCERTAIN (${selectedHit.note})`,
    };
  }
  if (selectedHit) {
    return {
      item: { id: target.id, subject: target.subject, content: target.content },
      decision: 'selected',
      section: 'KNOWN',
      relevance,
      support: { grade: gradeSupport(target), authority: target.authority, evidence: target.evidence },
      resolution: detail.resolution.superseded.some((s) => s.winner_id === target.id)
        ? { outcome: 'won its subject', reason: 'superseded a conflicting item' }
        : { outcome: 'no conflict' },
      budget: {
        rank: detail.ordered.findIndex((c) => c.item.id === target.id) + 1,
        fit: true,
      },
      reason: `relevance ${relevance.score.toFixed(2)} above threshold, support ${gradeSupport(target)}, fit budget`,
    };
  }
  if (supersededHit) {
    return {
      item: { id: target.id, subject: target.subject, content: target.content },
      decision: 'superseded',
      relevance,
      support: { grade: gradeSupport(target), authority: target.authority, evidence: target.evidence },
      resolution: {
        outcome: 'lost its subject',
        winner_id: supersededHit.winner_id,
        reason: supersededHit.reason,
      },
      reason: `superseded by ${supersededHit.winner_id} (${supersededHit.reason}): ${supersededHit.winner_content}`,
    };
  }
  if (excludedHit) {
    return {
      item: { id: target.id, subject: target.subject, content: target.content },
      decision: 'excluded',
      relevance,
      support: { grade: gradeSupport(target), authority: target.authority, evidence: target.evidence },
      budget: excludedHit.stage === 'BUDGET'
        ? { rank: detail.ordered.findIndex((c) => c.item.id === target.id) + 1, fit: false }
        : undefined,
      reason: `[${excludedHit.stage}] ${excludedHit.reason} — ${excludedHit.detail}`,
    };
  }
  return {
    item: { id: target.id, subject: target.subject, content: target.content },
    decision: 'excluded',
    relevance,
    reason: 'not admitted',
  };
}

export function explain(
  items: Item[],
  options: CompileOptions,
  targetId: string,
): { trace: ExplainTrace | null; alternatives: ExplainTrace[] } {
  const detail = compileDetailed(items, options);
  const target = items.find((i) => i.id === targetId);
  if (!target) return { trace: null, alternatives: [] };

  const trace = traceFor(detail, options, target);
  const alternatives = items
    .filter((i) => i.id !== targetId && i.subject === target.subject)
    .map((i) => traceFor(detail, options, i));

  return { trace, alternatives };
}

export function renderTrace(trace: ExplainTrace, alternatives: ExplainTrace[]): string {
  const out: string[] = [];
  out.push(`WHY — ${trace.item.id}`);
  out.push(`  subject:   ${trace.item.subject}`);
  out.push(`  content:   ${trace.item.content}`);
  out.push(`  decision:  ${trace.decision.toUpperCase()}${trace.section ? ` → ${trace.section}` : ''}`);
  out.push('  selected because:');
  out.push(`    task token overlap: subject [${trace.relevance.matched_subject_tokens.join(', ')}] content [${trace.relevance.matched_content_tokens.join(', ')}] → relevance ${trace.relevance.score.toFixed(2)} (threshold ${trace.relevance.threshold})`);
  if (trace.support) {
    out.push(`    authority: ${trace.support.authority}   evidence: ${trace.support.evidence}   support: ${trace.support.grade}`);
  }
  if (trace.resolution) {
    out.push(`    resolution: ${trace.resolution.outcome}${trace.resolution.winner_id ? ` → winner ${trace.resolution.winner_id}` : ''}${trace.resolution.reason ? ` (${trace.resolution.reason})` : ''}`);
  }
  if (trace.budget) {
    out.push(`    budget: rank ${trace.budget.rank}, fit=${trace.budget.fit}`);
  }
  out.push(`  → ${trace.reason}`);
  if (alternatives.length > 0) {
    out.push('  excluded alternatives on the same subject:');
    for (const alt of alternatives) {
      out.push(`    ${alt.item.id}: ${alt.decision.toUpperCase()} — ${alt.reason}`);
    }
  }
  return out.join('\n');
}
