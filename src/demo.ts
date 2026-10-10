/**
 * The deterministic demo.
 *
 * 28 raw items about one task — current facts, a superseded deploy method,
 * a duplicate, hearsay, unknowns and a pile of irrelevance — compiled into
 * one capsule with every rejection on the record. Same output every run:
 * the demo is a pure function, no clock, no network, no model.
 */

import fs from 'node:fs';
import type { Capsule, Item } from './types.js';
import { compileDetailed } from './compile.js';
import { renderCapsule, renderExclusions, renderStats } from './capsule.js';
import { explain, renderTrace } from './explain.js';
import { diff, renderDiff } from './diff.js';
import { fixturePath } from './paths.js';

export interface DemoFixture {
  task: string;
  budget: number;
  mission?: { objective: string; step: number; total_steps: number; next_action?: string };
  items: Array<Partial<Item> & { id: string; subject: string; content: string }>;
}

export function loadDemoFixture(file = 'deploy-billing.json'): { task: string; budget: number; now?: string; items: Item[] } {
  const raw = JSON.parse(fs.readFileSync(fixturePath(file), 'utf8')) as DemoFixture & { now?: string };
  const items: Item[] = raw.items.map((item) => ({
    authority: 0.6,
    evidence: 1,
    kind: 'fact',
    provider: 'static:deploy-billing',
    source: `static://deploy-billing/${item.id}`,
    ...item,
  }));
  if (raw.mission) {
    items.push({
      id: 'mission:checkpoint',
      subject: 'mission.checkpoint',
      content: `step ${raw.mission.step} / ${raw.mission.total_steps} — objective: ${raw.mission.objective}${raw.mission.next_action ? `; next: ${raw.mission.next_action}` : ''}`,
      kind: 'mission',
      provider: 'static:deploy-billing',
      source: 'mission://checkpoint',
      authority: 0.95,
      evidence: 1,
    });
  }
  return { ...raw, items };
}

function funnel(capsule: Capsule, strongCount: number, currentCount: number): string[] {
  const s = capsule.stats;
  const rankRejected = capsule.excluded.filter((e) => e.stage === 'RANK').length;
  const verifyRejected = capsule.excluded.filter((e) => e.stage === 'VERIFY').length;
  const uncertainSurfaced = capsule.uncertain.filter((i) => i.note?.includes('hearsay')).length;
  const budgetRejected = capsule.excluded.filter((e) => e.stage === 'BUDGET').length;
  const out = [
    `COLLECT   ${s.collected} raw items`,
    `RANK      ${s.collected} → ${s.relevant} in band        ${rankRejected} rejected: relevance below threshold`,
    `VERIFY    ${s.relevant} → ${s.relevant - verifyRejected} admissible      ${verifyRejected} rejected: hearsay with weak relevance${uncertainSurfaced > 0 ? ` (${uncertainSurfaced} hearsay surfaced as UNCERTAIN)` : ''}`,
    `RESOLVE   ${strongCount} assertable → ${currentCount} current   ${s.duplicates} duplicate, ${s.superseded} superseded`,
    `COMPRESS  ${s.selected} selected (${capsule.used_tokens} / ${capsule.budget_tokens} tokens, estimated)${budgetRejected > 0 ? `   ${budgetRejected} rejected: over budget` : ''}`,
  ];
  return out;
}

export interface DemoResult {
  capsule: Capsule;
  latency_ms: number;
  output: string;
}

export function runDemo(options: { json?: boolean; smoke?: boolean } = {}): DemoResult {
  const fixture = loadDemoFixture();
  const detail = compileDetailed(fixture.items, {
    task: fixture.task,
    budget: fixture.budget,
    agent: 'demo',
    now: fixture.now,
  });

  if (options.smoke) {
    const output = [
      `BANDPASS DEMO SMOKE`,
      `task: ${fixture.task}`,
      `collected=${detail.capsule.stats.collected} selected=${detail.capsule.stats.selected} rejected=${detail.capsule.stats.rejected} superseded=${detail.capsule.stats.superseded} duplicates=${detail.capsule.stats.duplicates}`,
      `used_tokens=${detail.capsule.used_tokens} budget=${detail.capsule.budget_tokens}`,
      `SMOKE OK`,
    ].join('\n');
    return { capsule: detail.capsule, latency_ms: detail.latency_ms, output };
  }

  if (options.json) {
    return {
      capsule: detail.capsule,
      latency_ms: detail.latency_ms,
      output: JSON.stringify(detail.capsule, null, 2),
    };
  }

  const strong = detail.ranked.filter(
    (r) => detail.resolution.current.some((c) => c.id === r.item.id) || detail.resolution.superseded.some((s) => s.id === r.item.id),
  );
  const lines: string[] = [];
  lines.push('bandpass — context compiler for AI agents');
  lines.push(`TASK     ${fixture.task}`);
  lines.push(`BUDGET   ${fixture.budget} tokens (estimated)`);
  lines.push('');
  lines.push('PIPELINE');
  lines.push(...funnel(detail.capsule, strong.length, detail.resolution.current.length));
  lines.push('');
  lines.push(renderCapsule(detail.capsule));
  lines.push('');
  lines.push(renderExclusions(detail.capsule));
  lines.push('');
  lines.push('STATS');
  lines.push(renderStats(detail.capsule));
  // Latency varies by machine; stdout stays byte-deterministic.
  process.stderr.write(`compile latency: ${detail.latency_ms.toFixed(1)} ms (measured, deterministic output)\n`);

  // context_explain showcase
  const { trace, alternatives } = explain(
    fixture.items,
    { task: fixture.task, budget: fixture.budget, agent: 'demo', now: fixture.now },
    'deploy.method.gha',
  );
  if (trace) {
    lines.push('');
    lines.push(renderTrace(trace, alternatives));
  }

  // context_diff showcase: same sources, different task
  const diffTask = 'investigate billing database latency';
  const diffResult = diff(
    fixture.items,
    { task: fixture.task, budget: fixture.budget, now: fixture.now },
    { task: diffTask, budget: fixture.budget, now: fixture.now },
  );
  lines.push('');
  lines.push(renderDiff(`"${fixture.task}" → "${diffTask}"`, diffResult));

  return { capsule: detail.capsule, latency_ms: detail.latency_ms, output: lines.join('\n') };
}
