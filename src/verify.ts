/**
 * VERIFY — grade every in-band item by its evidence.
 *
 * Authority (how trustworthy the source channel is) and evidence (how many
 * independent sources back the statement) combine into a support grade.
 * Hearsay is rejected — unless it is highly relevant to the task, in which
 * case it is surfaced as UNCERTAIN, clearly labeled weak. Weak signal about
 * the exact thing you are doing is information; silent confidence is not.
 */

import type { Item, Support } from './types.js';

export function gradeSupport(item: Item): Support {
  if (item.authority >= 0.85 && item.evidence >= 2) return 'VERIFIED';
  if (item.authority >= 0.7) return 'CORROBORATED';
  if (item.authority >= 0.5) return 'OBSERVED';
  if (item.authority >= 0.35) return 'INFERRED';
  return 'HEARSAY';
}
