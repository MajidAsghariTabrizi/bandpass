import test from 'node:test';
import assert from 'node:assert/strict';
import { rankItem, tokenize, RECENCY_HALF_LIFE_DAYS } from './rank.js';
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

test('tokenize drops stopwords and short tokens', () => {
  assert.deepEqual(tokenize('The deploy of the billing service, in production!'), [
    'deploy',
    'billing',
    'service',
    'production',
  ]);
});

test('subject matches count double', () => {
  const task = ['deploy', 'billing', 'service', 'production'];
  const subjectHit = rankItem(task, item({ id: 'a', subject: 'deploy.method', content: 'unrelated words here' }));
  const contentHit = rankItem(task, item({ id: 'b', subject: 'other.thing', content: 'the deploy pipeline' }));
  // subject hit: 2/8 = 0.25; content hit: 1/8 = 0.125
  assert.equal(subjectHit.score, 0.25);
  assert.equal(contentHit.score, 0.125);
});

test('mission items are always in band', () => {
  const r = rankItem(['deploy'], item({ id: 'm', subject: 'mission.checkpoint', content: 'step 1 / 2', kind: 'mission' }));
  assert.equal(r.score, 1);
});

test('unknowns about the subject keep a floor, unrelated unknowns do not', () => {
  const task = ['deploy', 'billing', 'service'];
  const related = rankItem(task, item({ id: 'u1', subject: 'deploy.oncall', content: 'who is on call', kind: 'unknown' }));
  const weaklyRelated = rankItem(task, item({ id: 'u3', subject: 'deploy.x', content: 'nothing here', kind: 'unknown' }));
  const unrelated = rankItem(task, item({ id: 'u2', subject: 'marketing.site', content: 'hero color', kind: 'unknown' }));
  assert.equal(related.score, 0.4); // lexical 0.33 lifted by the unknown floor
  assert.equal(weaklyRelated.score, 0.4); // same: any on-subject unknown keeps the 0.4 floor
  assert.equal(unrelated.score, 0); // no free ride
});

test('recency decay has a 180-day half-life and skips mission/unknown', () => {
  const now = '2026-10-05T00:00:00Z';
  const old = rankItem(
    ['deploy'],
    item({ id: 'old', subject: 'deploy.method', content: 'deploy method', observed_at: '2026-04-08T00:00:00Z' }),
    now,
  );
  assert.equal(old.stale_days, 180);
  assert.ok(Math.abs(old.score - old.lexical_score / 2) < 0.01, `score ${old.score} ≈ half of ${old.lexical_score}`);

  const mission = rankItem(
    ['deploy'],
    item({ id: 'm', subject: 'mission.checkpoint', content: 'deploy', kind: 'mission', observed_at: '2020-01-01T00:00:00Z' }),
    now,
  );
  assert.equal(mission.score, 1);
});

test('future observations do not decay', () => {
  const r = rankItem(['deploy'], item({ id: 'f', subject: 'deploy.method', content: 'deploy', observed_at: '2026-10-10T00:00:00Z' }), '2026-10-05T00:00:00Z');
  assert.equal(r.score, r.lexical_score);
  assert.equal(r.stale_days, undefined);
});

test('half-life constant is documented', () => {
  assert.equal(RECENCY_HALF_LIFE_DAYS, 180);
});
