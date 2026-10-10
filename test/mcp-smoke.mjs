#!/usr/bin/env node
/**
 * MCP protocol smoke test: spawn the real server over stdio, run the JSON-RPC
 * handshake, list tools, and call each one. This is the same wire protocol any
 * MCP client (Claude Code, Cursor, Codex, ...) speaks.
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import url from 'node:url';

const cli = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..', 'dist', 'cli.js');

class Client {
  constructor() {
    this.proc = spawn(process.execPath, [cli, 'mcp'], { stdio: ['pipe', 'pipe', 'pipe'] });
    this.nextId = 1;
    this.pending = new Map();
    this.buffer = '';
    this.proc.stdout.on('data', (chunk) => this.onData(chunk));
    this.proc.stderr.on('data', (c) => process.stderr.write(`[server] ${c}`));
  }

  onData(chunk) {
    this.buffer += chunk.toString('utf8');
    let idx;
    while ((idx = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.id !== undefined && this.pending.has(msg.id)) {
          this.pending.get(msg.id)(msg);
          this.pending.delete(msg.id);
        }
      } catch {
        // ignore non-JSON noise
      }
    }
  }

  request(method, params, timeoutMs = 15000) {
    const id = this.nextId++;
    const message = { jsonrpc: '2.0', id, method, params };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`timeout waiting for ${method}`));
      }, timeoutMs);
      this.pending.set(id, (msg) => {
        clearTimeout(timer);
        msg.error ? reject(new Error(`${method}: ${JSON.stringify(msg.error)}`)) : resolve(msg.result);
      });
      this.proc.stdin.write(`${JSON.stringify(message)}\n`);
    });
  }

  notify(method, params) {
    this.proc.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
  }

  close() {
    this.proc.kill();
  }
}

const failures = [];
function check(name, condition, detail = '') {
  if (condition) {
    console.log(`  ok    ${name}`);
  } else {
    failures.push(name);
    console.log(`  FAIL  ${name} ${detail}`);
  }
}

const client = new Client();
try {
  const init = await client.request('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'bandpass-smoke', version: '0.0.0' },
  });
  check('initialize returns serverInfo', init?.serverInfo?.name === 'bandpass');
  client.notify('notifications/initialized', {});

  const tools = await client.request('tools/list', {});
  const names = (tools.tools ?? []).map((t) => t.name);
  console.log(`  tools: ${names.join(', ')}`);
  check('six tools registered', names.length === 6, `got ${names.length}`);
  for (const expected of ['context_compile', 'context_explain', 'context_diff', 'context_sources', 'context_budget', 'context_status']) {
    check(`tool ${expected} present`, names.includes(expected));
  }

  const compiled = await client.request('tools/call', {
    name: 'context_compile',
    arguments: { task: 'deploy billing service to production', budget: 1200, agent: 'smoke' },
  });
  const capsule = compiled?.structuredContent?.capsule;
  check('context_compile returns a capsule', capsule?.schema === 'bandpass.capsule/v1');
  check('capsule has known + unknown + excluded', Array.isArray(capsule?.known) && Array.isArray(capsule?.unknown) && Array.isArray(capsule?.excluded));
  check('capsule text render attached', typeof compiled?.content?.[0]?.text === 'string' && compiled.content[0].text.includes('CONTEXT CAPSULE'));

  const explained = await client.request('tools/call', {
    name: 'context_explain',
    arguments: { task: 'deploy billing service to production', item_id: 'deploy.method.gha' },
  });
  check('context_explain returns a trace', explained?.structuredContent?.trace?.decision === 'selected');

  const diffed = await client.request('tools/call', {
    name: 'context_diff',
    arguments: { task_a: 'deploy billing service to production', task_b: 'investigate billing database latency' },
  });
  check('context_diff returns lines', Array.isArray(diffed?.structuredContent?.lines) && diffed.structuredContent.lines.length > 0);

  const sources = await client.request('tools/call', { name: 'context_sources', arguments: {} });
  check('context_sources returns providers', Array.isArray(sources?.structuredContent?.providers) && sources.structuredContent.providers.length > 0);

  const budget = await client.request('tools/call', {
    name: 'context_budget',
    arguments: { task: 'deploy billing service to production', budgets: [100, 500, 1200] },
  });
  const curve = budget?.structuredContent?.curve ?? [];
  check('context_budget curve has 3 points', curve.length === 3);
  check('budget curve is monotone in selected items', curve[0].selected <= curve[2].selected, JSON.stringify(curve));

  const status = await client.request('tools/call', { name: 'context_status', arguments: {} });
  check('context_status reports version + determinism', status?.structuredContent?.deterministic === true && !!status?.structuredContent?.version);
} finally {
  client.close();
}

if (failures.length > 0) {
  console.error(`MCP SMOKE FAILED: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('MCP SMOKE OK — 6 tools, wire protocol handshake, compile/explain/diff/sources/budget/status verified');
