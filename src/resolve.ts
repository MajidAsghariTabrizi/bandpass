/**
 * RESOLVE — one current truth per subject.
 *
 * Retrieval happily returns both the Jenkins note and the GitHub Actions
 * note. The compiler does not: duplicates collapse to their strongest
 * source, supersession chains are honored, and unresolved conflicts are
 * decided by recency then authority — with the loser recorded, not hidden.
 */

import type { Item, SupersededRecord, ExclusionRecord } from './types.js';

function normalizeContent(content: string): string {
  return content.toLowerCase().replace(/[^a-z0-9 =.+-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function beats(a: Item, b: Item): number {
  // Deterministic total order: recency, then authority, then evidence, then id.
  const at = a.observed_at ?? '';
  const bt = b.observed_at ?? '';
  if (at !== bt) return at < bt ? -1 : 1;
  if (a.authority !== b.authority) return b.authority - a.authority;
  if (a.evidence !== b.evidence) return b.evidence - a.evidence;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export interface ResolutionResult {
  /** Items that survived dedup + supersession, in input order. */
  current: Item[];
  /** Conflict losers, recorded for inspection. */
  superseded: SupersededRecord[];
  /** Items rejected during resolution (duplicates, losers). */
  excluded: ExclusionRecord[];
  duplicates: number;
  conflicts: number;
}

export function resolve(items: Item[]): ResolutionResult {
  const superseded: SupersededRecord[] = [];
  const excluded: ExclusionRecord[] = [];
  let duplicates = 0;
  let conflicts = 0;

  const input = [...items];

  // Pass 1 — exact duplicates: same normalized content (any subject overlap check):
  // keep the strongest source, record the rest.
  const byContent = new Map<string, Item[]>();
  for (const item of input) {
    const key = normalizeContent(item.content);
    const bucket = byContent.get(key) ?? [];
    bucket.push(item);
    byContent.set(key, bucket);
  }

  const afterDedup: Item[] = [];
  for (const bucket of byContent.values()) {
    bucket.sort(beats);
    // Ascending order: the LAST item is the strongest (newest, most authoritative).
    const winner = bucket[bucket.length - 1];
    if (!winner) continue;
    afterDedup.push(winner);
    for (const loser of bucket.slice(0, -1)) {
      duplicates += 1;
      excluded.push({
        id: loser.id,
        subject: loser.subject,
        content: loser.content,
        stage: 'RESOLVE',
        reason: 'duplicate',
        detail: `stronger source exists: ${winner.id} (${winner.source})`,
      });
    }
  }

  // Restore deterministic input order before subject resolution.
  afterDedup.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  // Pass 2 — subject conflicts: same subject, different content.
  const bySubject = new Map<string, Item[]>();
  for (const item of afterDedup) {
    const bucket = bySubject.get(item.subject) ?? [];
    bucket.push(item);
    bySubject.set(item.subject, bucket);
  }

  const current: Item[] = [];
  for (const bucket of bySubject.values()) {
    const strong = bucket.filter((i) => i.kind !== 'unknown');
    const unknowns = bucket.filter((i) => i.kind === 'unknown');
    current.push(...unknowns);

    if (strong.length <= 1) {
      current.push(...strong);
      continue;
    }

    // Explicit supersession first: an item naming the winner supersedes the named loser.
    const byId = new Map(strong.map((i) => [i.id, i]));
    const explicitLosers = new Set<string>();
    for (const item of strong) {
      if (!item.supersedes) continue;
      const target =
        byId.get(item.supersedes) ??
        strong.find((i) => i.id !== item.id && item.supersedes === `${i.subject}=${normalizeContent(i.content).split('=')[1]?.trim() ?? ''}`);
      if (target) {
        explicitLosers.add(target.id);
        conflicts += 1;
        superseded.push({
          id: target.id,
          subject: target.subject,
          content: target.content,
          winner_id: item.id,
          winner_content: item.content,
          reason: 'explicit-supersession',
          observed_at: target.observed_at,
        });
        excluded.push({
          id: target.id,
          subject: target.subject,
          content: target.content,
          stage: 'RESOLVE',
          reason: 'superseded',
          detail: `explicitly superseded by ${item.id}: ${item.content}`,
        });
      }
    }

    const remaining = strong.filter((i) => !explicitLosers.has(i.id));
    if (remaining.length <= 1) {
      current.push(...remaining);
      continue;
    }

    // Implicit conflict: newest observation wins; authority breaks ties.
    remaining.sort(beats);
    const winner = remaining[remaining.length - 1];
    if (!winner) continue;
    current.push(winner);
    for (const loser of remaining.slice(0, -1)) {
      conflicts += 1;
      const reason =
        (loser.observed_at ?? '') < (winner.observed_at ?? '') ? 'recency' : 'authority';
      superseded.push({
        id: loser.id,
        subject: loser.subject,
        content: loser.content,
        winner_id: winner.id,
        winner_content: winner.content,
        reason,
        observed_at: loser.observed_at,
      });
      excluded.push({
        id: loser.id,
        subject: loser.subject,
        content: loser.content,
        stage: 'RESOLVE',
        reason: 'superseded',
        detail: `conflict on "${loser.subject}": ${winner.id} wins by ${reason} — ${winner.content}`,
      });
    }
  }

  current.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { current, superseded, excluded, duplicates, conflicts };
}
