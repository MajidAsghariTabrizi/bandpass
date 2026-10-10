import test from 'node:test';
import assert from 'node:assert/strict';
import { runDemo, loadDemoFixture } from './demo.js';
import { compile } from './compile.js';

test('demo runs deterministically and shows the full story', () => {
  const a = runDemo();
  const b = runDemo();
  assert.equal(a.output, b.output, 'demo output is byte-identical across runs');

  assert.match(a.output, /PIPELINE/);
  assert.match(a.output, /COLLECT   \d+ raw items/);
  assert.match(a.output, /CONTEXT CAPSULE  bandpass\/v1/);
  assert.match(a.output, /REJECTED \(\d+\)/);
  assert.match(a.output, /WHY — deploy\.method\.gha/);
  assert.match(a.output, /CAPSULE DIFF/);
  assert.ok(a.capsule.used_tokens > 0);
  assert.ok(a.latency_ms < 1000);
});

test('demo smoke mode is stable and machine-checkable', () => {
  const a = runDemo({ smoke: true });
  const b = runDemo({ smoke: true });
  assert.equal(a.output, b.output);
  assert.match(a.output, /SMOKE OK/);
  assert.match(a.output, /collected=\d+ selected=\d+ rejected=\d+/);
});

test('demo json mode emits a valid capsule', () => {
  const result = runDemo({ json: true });
  const capsule = JSON.parse(result.output);
  assert.equal(capsule.schema, 'bandpass.capsule/v1');
  assert.ok(Array.isArray(capsule.known));
});

test('the demo corpus contains the thesis cases', () => {
  const fixture = loadDemoFixture();
  const capsule = compile(fixture.items, { task: fixture.task, budget: fixture.budget, now: fixture.now });
  // current fact retained
  assert.ok(capsule.known.some((k) => k.id === 'deploy.method.gha'), 'current method kept');
  // superseded fact rejected
  assert.ok(capsule.superseded.some((s) => s.id === 'deploy.method.jenkins'), 'superseded method recorded');
  // duplicate rejected
  assert.equal(capsule.excluded.some((e) => e.reason === 'duplicate'), true, 'duplicate rejected');
  // hearsay handled: on-topic hearsay is surfaced as UNCERTAIN, off-topic is rejected
  const uncertainHearsay = capsule.uncertain.find((u) => (u.note ?? '').includes('hearsay'));
  assert.equal(uncertainHearsay?.id, 'deploy.rollback-owner', 'on-topic hearsay surfaced as UNCERTAIN');
  assert.ok(capsule.excluded.some((e) => e.id === 'hr.lunch'), 'off-topic hearsay rejected');
  // irrelevant dropped
  assert.ok(capsule.excluded.some((e) => e.id === 'marketing.site-color'), 'irrelevant dropped');
  // stale dropped
  assert.ok(capsule.excluded.some((e) => e.id === 'legacy.deploy-notes' && e.reason === 'stale observation'), 'stale dropped');
  // unknowns preserved
  assert.ok(capsule.unknown.length >= 2, 'unknowns preserved');
});
