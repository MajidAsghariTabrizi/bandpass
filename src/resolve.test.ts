import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from './resolve.js';
import type { Item } from './types.js';

function item(partial: Partial<Item> & { id: string }): Item {
  return {
    subject: partial.id,
    content: partial.id,
    kind: 'fact',
    provider: 'test',
    source: 'test://x',
    authority: 0.6,
    evidence: 1,
    ...partial,
  };
}

test('duplicates collapse to the newest, most authoritative source', () => {
  const result = resolve([
    item({ id: 'old', subject: 'deploy.region', content: 'deployment region = eu-west-1', observed_at: '2026-09-20T00:00:00Z', authority: 0.6 }),
    item({ id: 'config', subject: 'deploy.region', content: 'deployment region = eu-west-1', observed_at: '2026-10-02T00:00:00Z', authority: 0.95, evidence: 2 }),
  ]);
  assert.equal(result.current.length, 1);
  assert.equal(result.current[0]?.id, 'config');
  assert.equal(result.duplicates, 1);
  assert.equal(result.excluded[0]?.reason, 'duplicate');
  assert.ok(result.excluded[0]?.detail.includes('config'));
});

test('explicit supersession removes the named loser', () => {
  const result = resolve([
    item({ id: 'jenkins', subject: 'deploy.method', content: 'deployment method = Jenkins', observed_at: '2026-06-12T00:00:00Z', authority: 0.7 }),
    item({ id: 'gha', subject: 'deploy.method', content: 'deployment method = GitHub Actions', observed_at: '2026-09-30T00:00:00Z', authority: 0.9, supersedes: 'jenkins' }),
  ]);
  assert.equal(result.current.length, 1);
  assert.equal(result.current[0]?.id, 'gha');
  assert.equal(result.superseded[0]?.reason, 'explicit-supersession');
  assert.equal(result.superseded[0]?.winner_id, 'gha');
});

test('implicit conflict resolves by recency and records the loser', () => {
  const result = resolve([
    item({ id: 'stale', subject: 'deploy.window', content: 'deploy window = 02:00', observed_at: '2026-01-01T00:00:00Z', authority: 0.9 }),
    item({ id: 'fresh', subject: 'deploy.window', content: 'deploy window = 04:00', observed_at: '2026-09-01T00:00:00Z', authority: 0.6 }),
  ]);
  assert.equal(result.current.length, 1);
  assert.equal(result.current[0]?.id, 'fresh');
  assert.equal(result.superseded[0]?.reason, 'recency');
});

test('unknowns never fight: they pass through alongside facts', () => {
  const result = resolve([
    item({ id: 'fact', subject: 'deploy.method', content: 'deployment method = GitHub Actions' }),
    item({ id: 'u', subject: 'deploy.method', content: 'who owns migrations = unknown', kind: 'unknown' }),
  ]);
  assert.equal(result.current.length, 2);
  assert.equal(result.conflicts, 0);
});

test('resolution is deterministic for identical input', () => {
  const items = [
    item({ id: 'b', subject: 's', content: 'same statement', observed_at: '2026-02-01T00:00:00Z' }),
    item({ id: 'a', subject: 's', content: 'same statement', observed_at: '2026-02-01T00:00:00Z' }),
  ];
  const one = JSON.stringify(resolve(items));
  const two = JSON.stringify(resolve(items));
  assert.equal(one, two);
  // Full tie (same timestamp, authority, evidence) → id breaks the tie: last wins.
  assert.equal(resolve(items).current[0]?.id, 'b');
});
