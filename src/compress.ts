/**
 * COMPRESS — fit the capsule into the token budget, and make every overflow
 * decision visible. Mission state and unknowns are reserved first (small,
 * decisive); then strong facts in relevance order until the budget is spent.
 * Whatever does not fit is rejected with its rank — never silently dropped.
 */

import type { SelectedItem } from './types.js';

export interface Candidate {
  section: 'known' | 'uncertain';
  item: SelectedItem;
}

export interface CompressResult {
  known: SelectedItem[];
  uncertain: SelectedItem[];
  /** Candidates that would have fit semantically but lost to the budget. */
  overflow: Candidate[];
}

export function compress(
  ordered: Candidate[],
  measure: (candidate: { known: SelectedItem[]; uncertain: SelectedItem[] }) => number,
  budget: number,
): CompressResult {
  const known: SelectedItem[] = [];
  const uncertain: SelectedItem[] = [];
  const overflow: Candidate[] = [];

  for (const candidate of ordered) {
    const nextKnown = candidate.section === 'known' ? [...known, candidate.item] : known;
    const nextUncertain =
      candidate.section === 'uncertain' ? [...uncertain, candidate.item] : uncertain;
    const used = measure({ known: nextKnown, uncertain: nextUncertain });
    if (used <= budget) {
      if (candidate.section === 'known') known.push(candidate.item);
      else uncertain.push(candidate.item);
    } else {
      overflow.push(candidate);
    }
  }

  return { known, uncertain, overflow };
}
