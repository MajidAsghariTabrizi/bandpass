import test from 'node:test';
import assert from 'node:assert/strict';
import { StaticProvider } from './providers/static.js';
import { EnvProvider } from './providers/env.js';
import { MissionProvider } from './providers/mission.js';
import { CredenceProvider } from './providers/credence.js';
import { buildProviders, collectAll } from './providers/index.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function tmpdir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'bandpass-test-'));
}

test('static provider loads a fixture and defaults grades', async () => {
  const dir = tmpdir();
  const file = path.join(dir, 'items.json');
  fs.writeFileSync(file, JSON.stringify({ items: [{ id: 'x', subject: 'deploy.region', content: 'region = eu-west-1' }] }));
  const provider = new StaticProvider(file);
  assert.equal(provider.available(), true);
  const items = provider.collect();
  assert.equal(items.length, 1);
  assert.equal(items[0]?.authority, 0.6, 'default authority applied');
  assert.equal(items[0]?.provider, 'static:items');
  fs.rmSync(dir, { recursive: true });
});

test('env provider maps prefixed variables to state items', () => {
  process.env['BANDPASS_ITEM_DEPLOY__REGION'] = 'eu-west-1';
  const provider = new EnvProvider();
  const items = provider.collect();
  delete process.env['BANDPASS_ITEM_DEPLOY__REGION'];
  const hit = items.find((i) => i.id === 'env:deploy.region');
  assert.ok(hit, 'env item found');
  assert.equal(hit.kind, 'state');
  assert.equal(hit.content, 'eu-west-1');
});

test('mission provider emits a mission checkpoint item', () => {
  const dir = tmpdir();
  const file = path.join(dir, 'mission.json');
  fs.writeFileSync(file, JSON.stringify({ objective: 'ship it', step: 2, total_steps: 5, next_action: 'test' }));
  const provider = new MissionProvider(file);
  const items = provider.collect();
  assert.equal(items.length, 1);
  assert.equal(items[0]?.kind, 'mission');
  assert.match(items[0]?.content ?? '', /step 2 \/ 5/);
  fs.rmSync(dir, { recursive: true });
});

test('credence provider maps support grades to authority and UNKNOWN to unknown kind', () => {
  const dir = tmpdir();
  const file = path.join(dir, 'claims.jsonl');
  const lines = [
    JSON.stringify({ id: 'claim:a', subject: 'deploy.method', text: 'method = GitHub Actions', state: 'ACTIVE', support: 'VERIFIED', evidence_count: 3, last_verified_at: '2026-09-30T00:00:00Z' }),
    JSON.stringify({ id: 'claim:b', text: 'migration owner = not established', state: 'ACTIVE', support: 'UNKNOWN', evidence_count: 0 }),
    JSON.stringify({ id: 'claim:c', text: 'rejected claim', state: 'REJECTED', support: 'OBSERVED' }),
  ];
  fs.writeFileSync(file, lines.join('\n'));
  const provider = new CredenceProvider(file);
  const items = provider.collect();
  assert.equal(items.length, 2, 'REJECTED claims are skipped');
  const verified = items.find((i) => i.id === 'credence:claim:a');
  assert.equal(verified?.authority, 0.95);
  assert.equal(verified?.evidence, 3);
  const unknown = items.find((i) => i.id === 'credence:claim:b');
  assert.equal(unknown?.kind, 'unknown');
  fs.rmSync(dir, { recursive: true });
});

test('collectAll degrades instead of crashing on a missing provider', async () => {
  const providers = buildProviders({ static: ['Z:/does/not/exist.json'] });
  const { items, statuses } = await collectAll(providers);
  assert.equal(items.length, 0);
  assert.equal(statuses[0]?.available, false);
  assert.ok(statuses[0]?.error);
});
