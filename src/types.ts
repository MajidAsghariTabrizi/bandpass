/**
 * bandpass — core types.
 *
 * The compiler turns raw Items into a Context Capsule: a compact,
 * inspectable, provenance-aware packet containing only the information an
 * agent should receive for the current task.
 */

/** Epistemic grade of an item, derived from authority + evidence count. */
export type Support = 'VERIFIED' | 'CORROBORATED' | 'OBSERVED' | 'INFERRED' | 'HEARSAY';

export type ItemKind = 'fact' | 'state' | 'unknown' | 'mission';

/**
 * A single unit of raw context arriving from a provider.
 * Items are the INPUT of the compiler — unfiltered, possibly stale,
 * duplicated, contradictory or hearsay.
 */
export interface Item {
  /** Stable identifier (unique within a compile). Used in every report. */
  id: string;
  /** Canonical subject key, e.g. "deploy.method". Items with the same subject compete. */
  subject: string;
  /** Human-readable statement, e.g. "deployment method = GitHub Actions". */
  content: string;
  kind: ItemKind;
  /** Provider id, e.g. "static", "fs", "git", "credence". */
  provider: string;
  /** Source locator, e.g. "static://deploy-billing/runbook.md". */
  source: string;
  /** ISO timestamp of when the item was observed/recorded. Older loses conflicts. */
  observed_at?: string;
  /** Authority of the source channel, 0..1 (config ≈ 0.95, docs ≈ 0.6, hearsay ≈ 0.25). */
  authority: number;
  /** Number of independent supporting sources behind the item. */
  evidence: number;
  /** Explicit supersession: this item supersedes the item whose id (or "subject=value") is named. */
  supersedes?: string;
}

/** An item as admitted into the capsule, with its measured grades. */
export interface SelectedItem {
  id: string;
  subject: string;
  content: string;
  kind: ItemKind;
  support: Support;
  /** Task relevance, 0..1, measured by the rank stage. */
  relevance: number;
  authority: number;
  evidence: number;
  provider: string;
  source: string;
  observed_at?: string;
  /** Compact summary of what this item superseded, if anything. */
  supersedes_summary?: string;
  /** Marks weak evidence surfaced as UNCERTAIN rather than silently dropped. */
  note?: string;
}

/** A conflict loser, kept visible for inspection but out of the agent's context. */
export interface SupersededRecord {
  id: string;
  subject: string;
  content: string;
  winner_id: string;
  winner_content: string;
  reason: 'explicit-supersession' | 'recency' | 'authority' | 'conflict-resolution';
  observed_at?: string;
}

/** Why a specific item did NOT make it into the capsule. Exclusion is first-class. */
export interface ExclusionRecord {
  id: string;
  subject: string;
  content: string;
  /** Pipeline stage that rejected the item. */
  stage: 'RANK' | 'VERIFY' | 'RESOLVE' | 'BUDGET';
  /** Short machine-readable reason. */
  reason: string;
  /** Human-readable detail, including which item won, if any. */
  detail: string;
}

export interface CapsuleStats {
  collected: number;
  relevant: number;
  verified: number;
  conflicts: number;
  superseded: number;
  duplicates: number;
  selected: number;
  rejected: number;
}

/** The compiled output. Pure function of (task, items, budget) — no hidden state. */
export interface Capsule {
  schema: 'bandpass.capsule/v1';
  task: string;
  agent?: string;
  budget_tokens: number;
  used_tokens: number;
  known: SelectedItem[];
  uncertain: SelectedItem[];
  unknown: SelectedItem[];
  superseded: SupersededRecord[];
  excluded: ExclusionRecord[];
  stats: CapsuleStats;
}

export interface CompileOptions {
  task: string;
  budget?: number;
  agent?: string;
  /** Reference time for recency decay (ISO). Omit for time-independent ranking. */
  now?: string;
  /** Minimum relevance for an item to stay in band. Default 0.15. */
  relevance_threshold?: number;
  /** Relevance at which weak evidence is surfaced as UNCERTAIN instead of dropped. Default 0.25. */
  uncertain_floor?: number;
}

/** Trace for one item — the answer to "why did this fact enter (or not enter) the context?" */
export interface ExplainTrace {
  item: { id: string; subject: string; content: string };
  decision: 'selected' | 'excluded' | 'superseded' | 'uncertain' | 'unknown';
  section?: 'KNOWN' | 'UNCERTAIN' | 'UNKNOWN';
  relevance: {
    score: number;
    lexical_score?: number;
    stale_days?: number;
    matched_subject_tokens: string[];
    matched_content_tokens: string[];
    threshold: number;
  };
  support?: { grade: Support; authority: number; evidence: number };
  resolution?: { outcome: string; winner_id?: string; reason?: string };
  budget?: { rank: number; fit: boolean };
  reason: string;
}

export interface DiffLine {
  marker: '+' | '-' | '→' | '?' | '!';
  subject: string;
  detail: string;
}
