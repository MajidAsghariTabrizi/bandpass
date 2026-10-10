import test from 'node:test';
import assert from 'node:assert/strict';
import { explain, renderTrace } from './explain.js';
import { diff, diffCapsules } from './diff.js';
import { loadDemoFixture } from './demo.js';
import { compile } from './compile.js';
import type { Item } from './types.js';

const fixture = loadDemoFixture();

test('explain answers why a selected fact entered', () => {
  const { trace, alternatives } = explain(
    fixture.items,
    { task: fixture.task, budget: fixture.budget, now: fixture.now },
    'deploy.method.gha',
  );
  assert.ok(trace);
  assert.equal(trace.decision, 'selected');
  assert.equal(trace.support?.grade, 'VERIFIED');
  assert.equal(trace.resolution?.outcome, 'won its subject');
  assert.ok((trace.budget?.rank ?? 0) > 0);
  assert.equal(alternatives.some((a) => a.item.id === 'deploy.method.jenkins'), true);
  const text = renderTrace(trace, alternatives);
  assert.match(text, /WHY — deploy\.method\.gha/);
  assert.match(text, /excluded alternatives/);
});

test('explain answers why a stale fact was rejected', () => {
  const { trace } = explain(
    fixture.items,
    { task: fixture.task, budget: fixture.budget, now: fixture.now },
    'legacy.deploy-notes',
  );
  assert.ok(trace);
  assert.equal(trace.decision, 'excluded');
  assert.match(trace.reason, /stale observation/);
  assert.ok((trace.relevance.stale_days ?? 0) > 2000);
});

test('explain reports duplicates and supersession losers honestly', () => {
  const { trace: dup } = explain(
    fixture.items,
    { task: fixture.task, budget: fixture.budget, now: fixture.now },
    'deploy.region.notes',
  );
  assert.equal(dup?.decision, 'excluded');
  assert.match(dup?.reason ?? '', /duplicate/);

  const { trace: sup } = explain(
    fixture.items,
    { task: fixture.task, budget: fixture.budget, now: fixture.now },
    'deploy.method.jenkins',
  );
  assert.equal(sup?.decision, 'superseded');
  assert.equal(sup?.resolution?.winner_id, 'deploy.method.gha');
});

test('diff between two tasks shows entries and exits', () => {
  const result = diff(
    fixture.items,
    { task: fixture.task, budget: fixture.budget, now: fixture.now },
    { task: 'investigate billing database latency', budget: fixture.budget, now: fixture.now },
  );
  const removed = result.lines.filter((l) => l.marker === '-').map((l) => l.subject);
  assert.ok(removed.includes('deploy.method'), 'deploy facts leave when the task changes');
  assert.ok(result.summary.length > 0);
});

test('diff flags a subject that became UNKNOWN', () => {
  const capsuleA = compile(
    [
      { id: 'f', subject: 'deploy.owner', content: 'deploy owner = platform', kind: 'fact', provider: 't', source: 't://f', authority: 0.9, evidence: 2, observed_at: '2026-01-01T00:00:00Z' },
    ],
    { task: 'deploy service', now: '2026-10-05T00:00:00Z' },
  );
  const capsuleB = compile(
    [
      { id: 'u', subject: 'deploy.owner', content: 'deploy owner = not established', kind: 'unknown', provider: 't', source: 't://u', authority: 0.3, evidence: 0 },
    ],
    { task: 'deploy service', now: '2026-10-05T00:00:00Z' },
  );
  const { lines } = diffCapsules(capsuleA, capsuleB);
  const unknownLine = lines.find((l) => l.subject === 'deploy.owner');
  assert.equal(unknownLine?.marker, '?');
  assert.match(unknownLine?.detail ?? '', /UNKNOWN/);
});
