/**
 * RANK — the task defines the passband.
 *
 * Relevance is a deterministic lexical measure: how much of the task's
 * vocabulary appears in the item's subject and content. Subject matches
 * count double. Recency then decays the score with a 180-day half-life
 * (only when `now` is provided, so compilation stays a pure function):
 * a 2019 deploy note may share the task's words, but it does not share
 * its time. Unknowns get a floor: an unknown about the task's subject
 * must stay visible even with weak lexical overlap.
 */

import type { Item } from './types.js';

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'to', 'of', 'in', 'on', 'for', 'with',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'it', 'this', 'that',
  'as', 'at', 'by', 'from', 'into', 'about', 'over', 'after', 'before',
  'what', 'which', 'who', 'whom', 'how', 'when', 'where', 'why', 'all',
  'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'can', 'will', 'just', 'should', 'now', 'do', 'does', 'did', 'doing',
  'my', 'we', 'our', 'you', 'your', 'their', 'its',
]);

/** Recency half-life in days: after 180 days an item keeps half its score. */
export const RECENCY_HALF_LIFE_DAYS = 180;

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

export interface RankedItem {
  item: Item;
  score: number;
  /** Score before recency decay (reported by explain). */
  lexical_score: number;
  /** Days between `now` and observed_at, when both are known. */
  stale_days?: number;
  matched_subject_tokens: string[];
  matched_content_tokens: string[];
}

export function rankItem(taskTokens: string[], item: Item, now?: string): RankedItem {
  const taskSet = new Set(taskTokens);
  const subjectTokens = tokenize(item.subject.replace(/[._-]+/g, ' '));
  const contentTokens = tokenize(item.content);

  const matched_subject_tokens = subjectTokens.filter((t) => taskSet.has(t));
  const matched_content_tokens = contentTokens.filter((t) => taskSet.has(t));

  const denom = Math.max(1, taskTokens.length * 2);
  const lexical = Math.min(1, (2 * matched_subject_tokens.length + matched_content_tokens.length) / denom);

  let score = lexical;
  if (item.kind === 'mission') score = 1; // mission state is always in band
  // An unknown about the task's subject stays visible even with weak lexical
  // overlap — but an unrelated unknown must not ride along for free.
  if (item.kind === 'unknown' && lexical > 0) score = Math.max(0.4, lexical);

  const lexical_score = score;
  let stale_days: number | undefined;
  if (now && item.observed_at) {
    const ageDays = (Date.parse(now) - Date.parse(item.observed_at)) / 86_400_000;
    if (Number.isFinite(ageDays) && ageDays > 0) {
      stale_days = Math.round(ageDays);
      // Mission state and unknowns do not decay — they are not observations.
      if (item.kind !== 'mission' && item.kind !== 'unknown') {
        score = score * (1 / (1 + ageDays / RECENCY_HALF_LIFE_DAYS));
      }
    }
  }

  return {
    item,
    score,
    lexical_score,
    stale_days,
    matched_subject_tokens: [...new Set(matched_subject_tokens)],
    matched_content_tokens: [...new Set(matched_content_tokens)],
  };
}

export function rankAll(task: string, items: Item[], now?: string): RankedItem[] {
  const taskTokens = [...new Set(tokenize(task))];
  return items.map((item) => rankItem(taskTokens, item, now));
}
