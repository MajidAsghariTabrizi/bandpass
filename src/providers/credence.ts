/**
 * Credence provider — consume an evidence-first claim export.
 *
 * Credence (https://github.com/MajidAsghariTabrizi/credence) is an
 * evidence-first agent memory: every claim carries graded support, evidence
 * counts, supersession state and an explicit UNKNOWN. bandpass does NOT
 * reimplement any of that — it consumes a claim export over this small,
 * documented public interface (JSONL, one claim per line):
 *
 *   {
 *     "id": "claim:deploy.method",
 *     "subject": "deploy.method",            // optional; defaults to id
 *     "text": "deployment method = GitHub Actions",
 *     "state": "ACTIVE",                     // ACTIVE | STALE | SUPERSEDED | REJECTED
 *     "support": "VERIFIED",                 // VERIFIED | CORROBORATED | OBSERVED | PRIOR | INFERRED | UNKNOWN | HEARSAY
 *     "evidence_count": 3,
 *     "last_verified_at": "2026-09-30T08:00:00Z",
 *     "supersedes": "claim:deploy.method.jenkins"   // optional, claim id
 *   }
 *
 * Anything that can emit this shape works — Credence's claim model maps 1:1.
 * Claims arrive with their grades intact; bandpass still ranks, resolves and
 * budgets them like any other item. Evidence-aware memory is one input, not
 * the boss.
 */

import fs from 'node:fs';
import type { Item } from '../types.js';
import type { Provider } from './index.js';

const AUTHORITY_BY_SUPPORT: Record<string, number> = {
  VERIFIED: 0.95,
  CORROBORATED: 0.85,
  OBSERVED: 0.7,
  PRIOR: 0.55,
  INFERRED: 0.4,
  UNKNOWN: 0.3,
  HEARSAY: 0.2,
};

interface CredenceClaim {
  id: string;
  subject?: string;
  text: string;
  state?: string;
  support?: string;
  evidence_count?: number;
  last_verified_at?: string;
  supersedes?: string;
}

export class CredenceProvider implements Provider {
  readonly id = 'credence';
  private readonly file: string;

  constructor(file: string) {
    this.file = file;
  }

  available(): boolean {
    return fs.existsSync(this.file);
  }

  collect(): Item[] {
    const raw = fs.readFileSync(this.file, 'utf8');
    const items: Item[] = [];
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const claim = JSON.parse(trimmed) as CredenceClaim;
      if (claim.state === 'REJECTED') continue;

      const support = claim.support ?? 'OBSERVED';
      const authority = AUTHORITY_BY_SUPPORT[support] ?? 0.5;
      const isUnknown = support === 'UNKNOWN';

      items.push({
        id: `credence:${claim.id}`,
        subject: claim.subject ?? claim.id.replace(/^claim:/, ''),
        content: claim.text,
        kind: isUnknown ? 'unknown' : 'fact',
        provider: this.id,
        source: `credence://${claim.id}`,
        observed_at: claim.last_verified_at,
        authority,
        evidence: claim.evidence_count ?? 1,
        supersedes: claim.supersedes ? `credence:${claim.supersedes}` : undefined,
      });
    }
    return items;
  }
}
