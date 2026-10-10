#!/usr/bin/env node
/**
 * bandpass deterministic benchmark.
 *
 * Synthetic corpora where every item's role is known by construction:
 *   required current facts, superseded facts, duplicates, hearsay,
 *   irrelevant information, and missing required facts (unknowns).
 *
 * Three context strategies over the exact same corpus:
 *   RAW       — stuff everything in (the default behavior of most stacks)
 *   RETRIEVAL — naive lexical top-k (the default behavior of memory+RAG)
 *   COMPILE   — bandpass: rank → verify → resolve → compress to a budget
 *
 * Measured honestly: token counts are ESTIMATES (4 chars ≈ 1 token); no LLM
 * quality claims are made. Deterministic: seeded PRNG, fixed reference time.
 *
 *   node bench/run.mjs          full run, writes bench/BENCHMARK.md
 *   node bench/run.mjs --smoke  2 tasks, console only, no file writes
 */

import { compile, tokenize, renderCapsule, estimateTokens } from '../dist/index.js';

// ---------- deterministic PRNG ----------
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOW = '2026-10-05T00:00:00Z';
const BUDGET = 800;

const TOPICS = [
  { domain: 'billing', subject: 'service', action: 'deploy' },
  { domain: 'auth', subject: 'tokens', action: 'rotate' },
  { domain: 'search', subject: 'index', action: 'rebuild' },
  { domain: 'checkout', subject: 'latency', action: 'reduce' },
  { domain: 'reports', subject: 'pipeline', action: 'migrate' },
  { domain: 'notifications', subject: 'queue', action: 'migrate' },
  { domain: 'uploads', subject: 'storage', action: 'audit' },
  { domain: 'accounts', subject: 'emails', action: 'deduplicate' },
  { domain: 'pricing', subject: 'engine', action: 'refactor' },
  { domain: 'inventory', subject: 'sync', action: 'debug' },
  { domain: 'webhooks', subject: 'delivery', action: 'harden' },
  { domain: 'sessions', subject: 'store', action: 'shard' },
];

const IRRELEVANT_POOL = [
  'marketing site hero color approved',
  'office plants watering schedule updated',
  'company all-hands moved to thursday',
  'design system renamed buttons',
  'cafeteria menu week 42 posted',
  'HR policy update: travel expenses',
  'new stickers arrived for laptops',
  'podcast episode 12 released',
  'logo refresh exploration notes',
  'team offsite venue shortlist',
  'parking garage maintenance window',
  'internal wiki theme switched to dark',
  'birthday calendar synced',
  'esports tournament signups open',
  'library book club reading list',
  'standing desk orders shipped',
];

function isoDaysAgo(days) {
  const base = Date.parse(NOW);
  return new Date(base - days * 86_400_000).toISOString();
}

function buildCorpus(topic, seed) {
  const rand = mulberry32(seed);
  const task = `${topic.action} ${topic.domain} ${topic.subject}`;
  const items = [];
  const requiredIds = [];
  let n = 0;
  const id = (role) => `${role}-${n++}`;

  // 6 required current facts — note fact #4 owns the `.method` subject,
  // which the stale items below will contest.
  const requiredFacts = [
    `${topic.domain} ${topic.subject} endpoint = ${topic.domain}-prod.internal:443`,
    `${topic.domain} ${topic.subject} owner = ${topic.domain} team`,
    `${topic.domain} ${topic.subject} config lives in config/${topic.domain}/${topic.subject}.yaml`,
    `${topic.domain} ${topic.subject} deploy method = GitHub Actions`,
    `${topic.domain} ${topic.subject} staging gate = smoke tests must pass`,
    `${topic.domain} ${topic.subject} rollback window = 15 minutes`,
  ];
  const subjects = [
    `${topic.domain}.${topic.subject}.endpoint`,
    `${topic.domain}.${topic.subject}.owner`,
    `${topic.domain}.${topic.subject}.config`,
    `${topic.domain}.${topic.subject}.method`,
    `${topic.domain}.${topic.subject}.gate`,
    `${topic.domain}.${topic.subject}.rollback`,
  ];
  for (const [k, content] of requiredFacts.entries()) {
    const i = id('required');
    items.push({
      id: i, subject: subjects[k], content,
      kind: 'fact', provider: 'bench', source: `bench://${i}`,
      observed_at: isoDaysAgo(Math.floor(rand() * 20) + 1),
      authority: 0.9, evidence: 2,
    });
    requiredIds.push(i);
  }

  // 4 stale facts: same subjects as the current method fact, older observations.
  // Retrieval finds them; only resolution can retire them.
  const oldActions = ['Jenkins', 'Capistrano', 'manual SSH', 'legacy cron'];
  for (const method of oldActions) {
    const staleId = id('stale');
    items.push({
      id: staleId, subject: `${topic.domain}.${topic.subject}.method`,
      content: `${topic.domain} ${topic.subject} deploy method = ${method}`,
      kind: 'fact', provider: 'bench', source: `bench://${staleId}`,
      observed_at: isoDaysAgo(400 + Math.floor(rand() * 400)),
      authority: 0.7, evidence: 1,
    });
  }

  // 8 duplicates of required facts from weaker sources
  for (let k = 0; k < 8; k++) {
    const dupOf = Math.floor(rand() * requiredFacts.length);
    const i = id('dup');
    items.push({
      id: i, subject: subjects[dupOf], content: requiredFacts[dupOf],
      kind: 'fact', provider: 'bench', source: `bench://${i}`,
      observed_at: isoDaysAgo(30 + Math.floor(rand() * 30)),
      authority: 0.5, evidence: 1,
    });
  }

  // 3 hearsay items about the task's own subject
  for (const h of [
    `${topic.domain} ${topic.subject} rollback owner may be platform team (unconfirmed)`,
    `someone said ${topic.domain} ${topic.subject} has a secret staging environment`,
    `${topic.domain} ${topic.subject} might be frozen next week (rumor)`,
  ]) {
    const i = id('hearsay');
    items.push({
      id: i, subject: `${topic.domain}.${topic.subject}.hearsay${n}`,
      content: h, kind: 'fact', provider: 'bench', source: `bench://${i}`,
      observed_at: isoDaysAgo(Math.floor(rand() * 5) + 1),
      authority: 0.25, evidence: 0,
    });
  }

  // 64 irrelevant items (occasionally lexically noisy, like real corpora)
  for (let k = 0; k < 64; k++) {
    const noise = rand() < 0.25 ? ` (relates to ${topic.domain} planning)` : '';
    const text = `${IRRELEVANT_POOL[Math.floor(rand() * IRRELEVANT_POOL.length)]}${noise}`;
    const i = id('irrelevant');
    items.push({
      id: i, subject: `noise.${k}`, content: text,
      kind: 'fact', provider: 'bench', source: `bench://${i}`,
      observed_at: isoDaysAgo(Math.floor(rand() * 200)),
      authority: 0.4 + rand() * 0.3, evidence: 1,
    });
  }

  // 2 unknowns (missing required facts, explicitly preserved)
  for (const u of [
    `who owns ${topic.domain} ${topic.subject} data migrations = not established`,
    `current on-call for ${topic.domain} ${topic.subject} = not established`,
  ]) {
    const i = id('unknown');
    items.push({
      id: i, subject: `${topic.domain}.${topic.subject}.unknown${n}`,
      content: u, kind: 'unknown', provider: 'bench', source: `bench://${i}`,
      authority: 0.3, evidence: 0,
    });
  }

  // mission checkpoint
  items.push({
    id: 'mission', subject: 'mission.checkpoint',
    content: `step 3 / 6 — objective: ${task}; next: execute`,
    kind: 'mission', provider: 'bench', source: 'bench://mission',
    authority: 0.95, evidence: 1,
  });

  return { task, items, requiredIds };
}

// ---------- strategies ----------
function rawStrategy(corpus) {
  const rendered = corpus.items.map((i) => `${i.content} [${i.source}]`).join('\n');
  return { text: rendered, tokens: estimateTokens(rendered), ids: corpus.items.map((i) => i.id) };
}

function retrievalStrategy(corpus, k = 12) {
  const taskTokens = new Set(tokenize(corpus.task));
  const scored = corpus.items
    .map((item) => {
      const tokens = new Set([...tokenize(item.subject.replace(/[._-]+/g, ' ')), ...tokenize(item.content)]);
      let overlap = 0;
      for (const t of taskTokens) if (tokens.has(t)) overlap += 1;
      return { item, overlap };
    })
    .sort((a, b) => b.overlap - a.overlap) // stable: ties keep insertion order
    .slice(0, k);
  const rendered = scored.map((s) => `${s.item.content} [${s.item.source}]`).join('\n');
  return { text: rendered, tokens: estimateTokens(rendered), ids: scored.map((s) => s.item.id) };
}

function compileStrategy(corpus) {
  const capsule = compile(corpus.items, { task: corpus.task, budget: BUDGET, now: NOW });
  const visible = [
    ...capsule.known.map((i) => i.id),
    ...capsule.uncertain.map((i) => i.id),
    ...capsule.unknown.map((i) => i.id),
  ];
  return {
    text: renderCapsule(capsule),
    tokens: capsule.used_tokens,
    ids: visible,
    // Hearsay in UNCERTAIN is delivered *labeled weak*, never asserted:
    assertedIds: capsule.known.map((i) => i.id),
    capsule,
  };
}

// ---------- scoring ----------
function score(strategy, corpus) {
  const idSet = new Set(strategy.ids);
  const assertedSet = new Set(strategy.assertedIds ?? strategy.ids);
  let irrelevant = 0;
  let stale = 0;
  let duplicates = 0;
  let hearsayAsserted = 0;
  let hearsayLabeled = 0;
  for (const id of strategy.ids) {
    if (id.startsWith('irrelevant-')) irrelevant += 1;
    if (id.startsWith('stale-')) stale += 1;
    if (id.startsWith('dup-')) duplicates += 1;
    if (id.startsWith('hearsay-')) {
      if (assertedSet.has(id)) hearsayAsserted += 1;
      else hearsayLabeled += 1;
    }
  }
  const requiredRetained = corpus.requiredIds.filter((id) => idSet.has(id)).length;
  const unknownsPreserved = corpus.items.filter((i) => i.kind === 'unknown' && idSet.has(i.id)).length;
  return {
    tokens: strategy.tokens,
    irrelevant, stale, duplicates,
    hearsayAsserted,
    hearsayLabeled,
    requiredRetained,
    requiredTotal: corpus.requiredIds.length,
    unknownsPreserved,
    unknownsTotal: corpus.items.filter((i) => i.kind === 'unknown').length,
  };
}

// ---------- run ----------
const smoke = process.argv.includes('--smoke');
const topics = smoke ? TOPICS.slice(0, 2) : TOPICS;

const results = { RAW: [], RETRIEVAL: [], COMPILE: [] };
let compileMs = 0;

for (const [index, topic] of topics.entries()) {
  const corpus = buildCorpus(topic, 42 + index);
  results.RAW.push(score(rawStrategy(corpus), corpus));
  results.RETRIEVAL.push(score(retrievalStrategy(corpus), corpus));
  const started = performance.now();
  const strategy = compileStrategy(corpus);
  compileMs += performance.now() - started;
  results.COMPILE.push(score(strategy, corpus));
}

function avg(rows, key) {
  return rows.reduce((acc, r) => acc + r[key], 0) / rows.length;
}

function row(name, rows) {
  return {
    strategy: name,
    input_tokens: Math.round(avg(rows, 'tokens')),
    irrelevant_facts: Number(avg(rows, 'irrelevant').toFixed(1)),
    stale_facts: Number(avg(rows, 'stale').toFixed(1)),
    duplicates: Number(avg(rows, 'duplicates').toFixed(1)),
    hearsay_asserted: Number(avg(rows, 'hearsayAsserted').toFixed(1)),
    hearsay_labeled_weak: Number(avg(rows, 'hearsayLabeled').toFixed(1)),
    required_retained: `${avg(rows, 'requiredRetained').toFixed(1)}/${avg(rows, 'requiredTotal')}`,
    unknowns_preserved: `${avg(rows, 'unknownsPreserved').toFixed(1)}/${avg(rows, 'unknownsTotal')}`,
  };
}

const table = [row('RAW', results.RAW), row('RETRIEVAL', results.RETRIEVAL), row('COMPILE', results.COMPILE)];
const meanCompileMs = (compileMs / topics.length).toFixed(1);

console.log(`bandpass benchmark — ${topics.length} tasks × 3 strategies (tokens are estimates: 4 chars ≈ 1 token)`);
console.table(table);
console.log(`compile latency (mean): ${meanCompileMs} ms per task (measured on this machine, ${process.version})`);

if (!smoke) {
  const { writeFileSync, mkdirSync } = await import('node:fs');
  mkdirSync(new URL('./', import.meta.url), { recursive: true });
  const header = `<!-- generated by bench/run.mjs — deterministic: seed 42+, fixed reference time ${NOW} -->

# Benchmark — RAW vs RETRIEVAL vs CONTEXT COMPILATION

Synthetic corpora (seeded PRNG, 12 tasks) where every item's role is known by
construction: 6 required current facts, 4 stale deploy methods, 8 duplicates,
3 hearsay, 64 irrelevant, 2 unknowns and a mission checkpoint per task.
All three strategies receive the **same corpus** for each task.

- **RAW** — concatenate everything (what "stuff it all in" does)
- **RETRIEVAL** — naive lexical top-8 (what memory+RAG does without resolution)
- **COMPILE** — bandpass at an 800-token budget (rank → verify → resolve → compress)

Token counts are **estimates** (4 chars ≈ 1 token). No LLM quality claims are
made or measured. Mean compile latency on the reference machine: ${meanCompileMs} ms per task.
`;
  const cols = ['strategy', 'input_tokens', 'irrelevant_facts', 'stale_facts', 'duplicates', 'hearsay_asserted', 'hearsay_labeled_weak', 'required_retained', 'unknowns_preserved'];
  const md = [
    header,
    `| ${cols.join(' | ')} |`,
    `| ${cols.map(() => '---').join(' | ')} |`,
    ...table.map((r) => `| ${cols.map((c) => r[c]).join(' | ')} |`),
    '',
    'What the numbers mean:',
    '',
    '- `stale_facts` counts superseded deploy methods delivered to the agent as if current.',
    '- `required_retained` — of 6 required facts, how many the strategy delivered.',
    '- `unknowns_preserved` — of 2 explicitly missing facts, how many stayed visible as UNKNOWN instead of vanishing.',
    '- RETRIEVAL keeps required facts but cannot deduplicate, resolve conflicts or preserve unknowns: it returns text, not grounds.',
  ].join('\n');
  writeFileSync(new URL('./BENCHMARK.md', import.meta.url), md);
  console.log('wrote bench/BENCHMARK.md');

  writeFileSync(new URL('./results.json', import.meta.url), JSON.stringify({ now: NOW, budget: BUDGET, tasks: topics.length, table, mean_compile_ms: Number(meanCompileMs) }, null, 2));
  console.log('wrote bench/results.json');
}

// Assertions used by CI smoke
const compileRow = table[2];
const rawRow = table[0];
if (compileRow.irrelevant_facts >= rawRow.irrelevant_facts) {
  console.error('SMOKE FAIL: compile delivers as much irrelevance as raw');
  process.exit(1);
}
if (compileRow.stale_facts > 0.5) {
  console.error('SMOKE FAIL: compile delivers stale facts');
  process.exit(1);
}
if (Number(compileRow.required_retained.split('/')[0]) < 5) {
  console.error('SMOKE FAIL: compile lost required facts');
  process.exit(1);
}
console.log('BENCH SMOKE OK');
