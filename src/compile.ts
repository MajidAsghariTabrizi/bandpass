/**
 * compile — the context compiler.
 *
 * RAW SOURCES → COLLECT → RANK → VERIFY → RESOLVE CONFLICTS → COMPRESS
 *   → CONTEXT CAPSULE
 *
 * compile() is a pure, deterministic function of (task, items, options).
 * No clock, no randomness, no model calls: the same inputs always produce
 * the same capsule. Latency is measured outside the capsule.
 */

import type {
  Capsule,
  CompileOptions,
  ExclusionRecord,
  Item,
  SelectedItem,
  Support,
} from './types.js';
import { rankAll, type RankedItem } from './rank.js';
import { gradeSupport } from './verify.js';
import { resolve, type ResolutionResult } from './resolve.js';
import { compress, type Candidate } from './compress.js';
import { buildCapsule, renderAgentContext } from './capsule.js';
import { estimateTokens } from './tokens.js';

export interface CompileDetail {
  capsule: Capsule;
  latency_ms: number;
  ranked: RankedItem[];
  resolution: ResolutionResult;
  ordered: Candidate[];
}

const SUPPORT_ORDER: Record<Support, number> = {
  VERIFIED: 4,
  CORROBORATED: 3,
  OBSERVED: 2,
  INFERRED: 1,
  HEARSAY: 0,
};

export function compile(items: Item[], options: CompileOptions): Capsule {
  return compileDetailed(items, options).capsule;
}

export function compileDetailed(items: Item[], options: CompileOptions): CompileDetail {
  const start = performance.now();
  const budget = options.budget ?? 1200;
  const threshold = options.relevance_threshold ?? 0.15;
  const uncertainFloor = options.uncertain_floor ?? 0.25;
  const excluded: ExclusionRecord[] = [];

  // 1 — RANK: the task defines the passband (with recency decay when `now` is set).
  const ranked = rankAll(options.task, items, options.now);
  const inBand: RankedItem[] = [];
  for (const r of ranked) {
    // A single content-token collision (e.g. a lunch note mentioning "service")
    // is lexical noise: in-band requires a subject match or ≥2 content matches.
    const bandGate =
      r.item.kind === 'mission' ||
      r.item.kind === 'unknown' ||
      r.matched_subject_tokens.length > 0 ||
      r.matched_content_tokens.length >= 2;
    if (r.item.kind === 'mission' || (r.score >= threshold && bandGate)) {
      inBand.push(r);
    } else if (r.stale_days !== undefined && r.stale_days > 365 && r.lexical_score >= threshold) {
      excluded.push({
        id: r.item.id,
        subject: r.item.subject,
        content: r.item.content,
        stage: 'RANK',
        reason: 'stale observation',
        detail: `last observed ${r.stale_days} days before now; lexical relevance ${r.lexical_score.toFixed(2)} decayed to ${r.score.toFixed(2)} < ${threshold} (180-day half-life)`,
      });
    } else if (r.score >= threshold && !bandGate) {
      excluded.push({
        id: r.item.id,
        subject: r.item.subject,
        content: r.item.content,
        stage: 'RANK',
        reason: 'lexical noise',
        detail: `single content-token match without subject match (relevance ${r.score.toFixed(2)}) — not enough evidence of task relation`,
      });
    } else {
      excluded.push({
        id: r.item.id,
        subject: r.item.subject,
        content: r.item.content,
        stage: 'RANK',
        reason: 'relevance below threshold',
        detail: `relevance ${r.score.toFixed(2)} < ${threshold} for task "${options.task}"`,
      });
    }
  }

  // 2 — VERIFY: grade evidence; hearsay is rejected unless highly relevant.
  const strong: Item[] = [];
  const uncertainItems: { item: Item; ranked: RankedItem }[] = [];
  const unknownItems: { item: Item; ranked: RankedItem }[] = [];
  let missionItem: { item: Item; ranked: RankedItem } | undefined;

  for (const r of inBand) {
    const { item } = r;
    if (item.kind === 'mission') {
      missionItem = { item, ranked: r };
      continue;
    }
    if (item.kind === 'unknown') {
      unknownItems.push({ item, ranked: r });
      continue;
    }
    const grade = gradeSupport(item);
    // The uncertain floor judges RELEVANCE, which is lexical — recency decay
    // must not push an on-topic hearsay item out of the UNCERTAIN section.
    if (grade === 'HEARSAY') {
      if (r.lexical_score >= uncertainFloor) {
        uncertainItems.push({ item, ranked: r }); // surfaced, labeled — never asserted
      } else {
        excluded.push({
          id: item.id,
          subject: item.subject,
          content: item.content,
          stage: 'VERIFY',
          reason: 'insufficient evidence (hearsay)',
          detail: `authority ${item.authority}, evidence ${item.evidence}, relevance ${r.score.toFixed(2)} below uncertain-floor ${uncertainFloor}`,
        });
      }
      continue;
    }
    strong.push(item);
  }

  // 3 — RESOLVE: dedup + supersession among the assertable items.
  const resolution = resolve(strong);
  excluded.push(...resolution.excluded);

  const winnerSummaries = new Map<string, string>();
  for (const s of resolution.superseded) {
    winnerSummaries.set(s.winner_id, s.content);
  }

  const toSelected = (item: Item, r: RankedItem, section: 'known' | 'uncertain'): SelectedItem => {
    const grade = gradeSupport(item);
    const sel: SelectedItem = {
      id: item.id,
      subject: item.subject,
      content: item.content,
      kind: item.kind,
      support: grade,
      relevance: Number(r.score.toFixed(2)),
      authority: item.authority,
      evidence: item.evidence,
      provider: item.provider,
      source: item.source,
      observed_at: item.observed_at,
    };
    const summary = winnerSummaries.get(item.id);
    if (summary) sel.supersedes_summary = summary;
    if (grade === 'HEARSAY') sel.note = 'weak evidence (hearsay) — flagged, not trusted';
    if (section === 'uncertain' && grade !== 'HEARSAY') sel.note = `weak support (${grade})`;
    return sel;
  };

  // Candidates: strong survivors (known/uncertain by grade) + surfaced hearsay (uncertain).
  const candidates: Candidate[] = [];
  const byIdRanked = new Map(inBand.map((r) => [r.item.id, r] as const));
  for (const item of resolution.current) {
    const r = byIdRanked.get(item.id);
    if (!r) continue;
    const grade = gradeSupport(item);
    const section = grade === 'VERIFIED' || grade === 'CORROBORATED' ? 'known' : 'uncertain';
    candidates.push({ section, item: toSelected(item, r, section) });
  }
  for (const { item, ranked: r } of uncertainItems) {
    candidates.push({ section: 'uncertain', item: toSelected(item, r, 'uncertain') });
  }

  // Deterministic ordering: relevance desc, support desc, id asc.
  candidates.sort((a, b) => {
    if (a.item.relevance !== b.item.relevance) return b.item.relevance - a.item.relevance;
    const sa = SUPPORT_ORDER[a.item.support];
    const sb = SUPPORT_ORDER[b.item.support];
    if (sa !== sb) return sb - sa;
    return a.item.id < b.item.id ? -1 : a.item.id > b.item.id ? 1 : 0;
  });

  // 4 — COMPRESS: reserve mission + unknowns first, then fill the budget.
  const unknownSelected: SelectedItem[] = unknownItems.map(({ item, ranked: r }) => ({
    id: item.id,
    subject: item.subject,
    content: item.content,
    kind: 'unknown',
    support: 'INFERRED' as Support,
    relevance: Number(r.score.toFixed(2)),
    authority: item.authority,
    evidence: item.evidence,
    provider: item.provider,
    source: item.source,
    observed_at: item.observed_at,
  }));

  const baseKnown: SelectedItem[] = [];
  if (missionItem) {
    baseKnown.push({
      id: missionItem.item.id,
      subject: missionItem.item.subject,
      content: missionItem.item.content,
      kind: 'mission',
      support: 'VERIFIED',
      relevance: 1,
      authority: missionItem.item.authority,
      evidence: missionItem.item.evidence,
      provider: missionItem.item.provider,
      source: missionItem.item.source,
      observed_at: missionItem.item.observed_at,
    });
  }

  const measure = (c: { known: SelectedItem[]; uncertain: SelectedItem[] }): number =>
    estimateTokens(
      renderAgentContext({
        schema: 'bandpass.capsule/v1',
        task: options.task,
        agent: options.agent,
        budget_tokens: budget,
        used_tokens: 0,
        known: [...baseKnown, ...c.known],
        uncertain: c.uncertain,
        unknown: unknownSelected,
        superseded: [],
        excluded: [],
        stats: {
          collected: 0, relevant: 0, verified: 0, conflicts: 0,
          superseded: 0, duplicates: 0, selected: 0, rejected: 0,
        },
      }),
    );

  const fitted = compress(candidates, measure, budget);

  for (const c of fitted.overflow) {
    const rank = candidates.findIndex((x) => x.item.id === c.item.id) + 1;
    excluded.push({
      id: c.item.id,
      subject: c.item.subject,
      content: c.item.content,
      stage: 'BUDGET',
      reason: 'over budget',
      detail: `rank ${rank}/${candidates.length} did not fit budget ${budget} tokens (estimated)`,
    });
  }

  const known = [...baseKnown, ...fitted.known];
  const uncertain = fitted.uncertain;
  const selected = known.length + uncertain.length + unknownSelected.length;

  const stats = {
    collected: items.length,
    relevant: inBand.length,
    verified: [...resolution.current].filter((i) => {
      const g = gradeSupport(i);
      return g === 'VERIFIED' || g === 'CORROBORATED';
    }).length,
    conflicts: resolution.conflicts,
    superseded: resolution.superseded.length,
    duplicates: resolution.duplicates,
    selected,
    rejected: excluded.length,
  };

  const capsule = buildCapsule({
    task: options.task,
    agent: options.agent,
    budget,
    known,
    uncertain,
    unknown: unknownSelected,
    superseded: resolution.superseded,
    excluded: excluded.sort((a, b) =>
      a.stage === b.stage
        ? a.id < b.id ? -1 : a.id > b.id ? 1 : 0
        : a.stage < b.stage ? -1 : 1,
    ),
    stats,
  });

  return {
    capsule,
    latency_ms: performance.now() - start,
    ranked,
    resolution,
    ordered: candidates,
  };
}
