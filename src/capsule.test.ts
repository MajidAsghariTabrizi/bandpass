import test from 'node:test';
import assert from 'node:assert/strict';
import { compile } from './compile.js';
import { renderCapsule, renderExclusions } from './capsule.js';
import { loadDemoFixture } from './demo.js';
import type { Item } from './types.js';

test('compile is deterministic: same inputs, same capsule', () => {
  const fixture = loadDemoFixture();
  const a = compile(fixture.items, { task: fixture.task, budget: fixture.budget, now: fixture.now });
  const b = compile(fixture.items, { task: fixture.task, budget: fixture.budget, now: fixture.now });
  assert.deepEqual(a, b);
});

test('demo corpus compiles into a capsule that respects its budget', () => {
  const fixture = loadDemoFixture();
  const capsule = compile(fixture.items, { task: fixture.task, budget: fixture.budget, now: fixture.now });
  assert.ok(capsule.used_tokens <= capsule.budget_tokens, `used ${capsule.used_tokens} <= ${capsule.budget_tokens}`);
  assert.ok(capsule.known.length > 0);
  assert.ok(capsule.unknown.length > 0, 'unknowns stay explicit');
  assert.ok(capsule.superseded.length > 0, 'supersession recorded');
  assert.equal(capsule.schema, 'bandpass.capsule/v1');
});

test('every selected fact carries provenance', () => {
  const fixture = loadDemoFixture();
  const capsule = compile(fixture.items, { task: fixture.task, budget: fixture.budget, now: fixture.now });
  for (const item of [...capsule.known, ...capsule.uncertain]) {
    assert.ok(item.source.length > 0, `${item.id} has a source`);
    assert.ok(item.relevance >= 0 && item.relevance <= 1);
  }
});

test('every exclusion has a stage and a reason', () => {
  const fixture = loadDemoFixture();
  const capsule = compile(fixture.items, { task: fixture.task, budget: fixture.budget, now: fixture.now });
  assert.ok(capsule.excluded.length > 0);
  for (const e of capsule.excluded) {
    assert.ok(['RANK', 'VERIFY', 'RESOLVE', 'BUDGET'].includes(e.stage));
    assert.ok(e.reason.length > 0);
    assert.ok(e.detail.length > 0);
  }
  const rejectedRendered = renderExclusions(capsule);
  assert.match(rejectedRendered, /REJECTED \(\d+\)/);
});

test('tight budget pushes items out with an over-budget reason', () => {
  const fixture = loadDemoFixture();
  const capsule = compile(fixture.items, { task: fixture.task, budget: 420, now: fixture.now });
  const overBudget = capsule.excluded.filter((e) => e.stage === 'BUDGET');
  assert.ok(overBudget.length > 0, 'some item loses to the budget');
  assert.ok(capsule.used_tokens <= 420);
  for (const e of overBudget) assert.match(e.detail, /rank \d+\/\d+ did not fit budget/);
});

test('capsule render has the documented section markers', () => {
  const fixture = loadDemoFixture();
  const capsule = compile(fixture.items, { task: fixture.task, budget: fixture.budget, now: fixture.now });
  const text = renderCapsule(capsule);
  assert.match(text, /CONTEXT CAPSULE  bandpass\/v1/);
  assert.match(text, /TASK        /);
  assert.match(text, /KNOWN \(\d+\)/);
  assert.match(text, /UNKNOWN \(\d+\)/);
  assert.match(text, /SUPERSEDED \(\d+\)/);
  assert.match(text, /✓ /);
  assert.match(text, /~ /);
  assert.match(text, /\? /);
  assert.match(text, /× /);
});

test('irrelevant high-authority config is still rejected by relevance', () => {
  const items: Item[] = [
    { id: 'cfg', subject: 'staging.db-url', content: 'staging database endpoint = staging-db.internal:5432 (from staging config)', kind: 'fact', provider: 't', source: 'config://staging', observed_at: '2026-09-18T00:00:00Z', authority: 0.9, evidence: 1 },
    { id: 'fact', subject: 'deploy.method', content: 'deployment method = GitHub Actions', kind: 'fact', provider: 't', source: 'config://ci', observed_at: '2026-09-30T00:00:00Z', authority: 0.9, evidence: 2 },
  ];
  const capsule = compile(items, { task: 'deploy billing service', now: '2026-10-05T00:00:00Z' });
  assert.equal(capsule.known.some((k) => k.id === 'cfg'), false);
  assert.equal(capsule.excluded.find((e) => e.id === 'cfg')?.stage, 'RANK');
});

test('a single content-token collision without a subject match is lexical noise', () => {
  const items: Item[] = [
    { id: 'noise', subject: 'hr.lunch', content: 'team lunch after the service demo, vegetarian option', kind: 'fact', provider: 't', source: 'chat://l', authority: 0.6, evidence: 1 },
    { id: 'real', subject: 'deploy.service', content: 'billing service endpoint = billing.internal', kind: 'fact', provider: 't', source: 'config://x', authority: 0.9, evidence: 2 },
  ];
  const capsule = compile(items, { task: 'deploy billing service', now: '2026-10-05T00:00:00Z' });
  assert.equal(capsule.excluded.find((e) => e.id === 'noise')?.reason, 'lexical noise');
  assert.equal(capsule.known.some((k) => k.id === 'real'), true);
});

test('on-subject hearsay surfaces as UNCERTAIN, off-subject hearsay is rejected', () => {
  const items: Item[] = [
    { id: 'h1', subject: 'deploy.rollback-owner', content: 'rollback owner may be platform team', kind: 'fact', provider: 't', source: 'chat://x', authority: 0.25, evidence: 0 },
    { id: 'h2', subject: 'hr.lunch', content: 'team lunch friday after the service demo', kind: 'fact', provider: 't', source: 'chat://y', authority: 0.25, evidence: 0 },
  ];
  const capsule = compile(items, { task: 'deploy billing service', now: '2026-10-05T00:00:00Z' });
  assert.equal(capsule.uncertain.some((u) => u.id === 'h1'), true, 'relevant hearsay stays visible');
  assert.equal(capsule.excluded.find((e) => e.id === 'h2')?.stage, 'RANK');
  assert.equal(capsule.excluded.find((e) => e.id === 'h2')?.reason, 'lexical noise');
});
