/**
 * bandpass MCP server.
 *
 * Six read-only tools over stdio:
 *   context_compile  — the killer tool: task + budget → Context Capsule
 *   context_explain  — why did this fact enter (or not enter) the context?
 *   context_diff     — what changed between two compilations?
 *   context_sources  — provider inventory and health
 *   context_budget   — the budget curve: what fits at which budget
 *   context_status   — server/runtime facts
 *
 * The server is stateless: every tool re-runs the deterministic compiler.
 * No session, no cache, no writes. Same inputs, same answer.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { compile } from '../compile.js';
import { compileDetailed } from '../compile.js';
import { explain, renderTrace } from '../explain.js';
import { diff, renderDiff } from '../diff.js';
import { renderCapsule } from '../capsule.js';
import { buildProviders, collectAll, type SourceSpec } from '../providers/index.js';
import { fixturePath } from '../paths.js';
import { VERSION } from '../version.js';

const sourcesSchema = z
  .object({
    static: z.array(z.string()).optional().describe('JSON item files ({items:[...]})'),
    fs: z.string().optional().describe('directory to walk for file-backed items'),
    git: z.boolean().optional().describe('expose git branch/head/worktree state of cwd'),
    env: z.string().optional().describe('environment variable prefix (default BANDPASS_ITEM_)'),
    mission: z.string().optional().describe('mission checkpoint JSON path'),
    credence: z.string().optional().describe('Credence claim export (JSONL) path'),
  })
  .optional()
  .describe('Input sources. Omit for the bundled demo corpus.');

async function loadItems(sources?: SourceSpec) {
  const spec: SourceSpec = sources ?? { static: [fixturePath('deploy-billing.json')] };
  const providers = buildProviders(spec);
  return collectAll(providers);
}

export function buildServer(): McpServer {
  const server = new McpServer(
    { name: 'bandpass', version: VERSION },
    {
      instructions:
        'bandpass is a context compiler: it turns raw sources (memory, files, git, state) into a compact, evidence-aware Context Capsule scoped to the current task, with every exclusion recorded. Start with context_compile.',
    },
  );

  server.registerTool(
    'context_compile',
    {
      title: 'Compile context',
      description:
        'Compile raw sources into a Context Capsule: the known/uncertain/unknown facts relevant to THIS task, within a token budget, with sources, support grades, supersession and a full rejection ledger. The core bandpass tool.',
      inputSchema: {
        task: z.string().describe('The task the agent is about to perform. Defines the passband.'),
        budget: z.number().int().positive().optional().describe('Token budget (estimated tokens). Default 1200.'),
        agent: z.string().optional().describe('Agent identity to stamp on the capsule.'),
        sources: sourcesSchema,
      },
    },
    async ({ task, budget, agent, sources }) => {
      const { items, statuses } = await loadItems(sources);
      const detail = compileDetailed(items, { task, budget, agent, now: new Date().toISOString() });
      return {
        content: [{ type: 'text', text: renderCapsule(detail.capsule) }],
        structuredContent: {
          capsule: detail.capsule,
          providers: statuses,
          compile_latency_ms: Number(detail.latency_ms.toFixed(1)),
        },
      };
    },
  );

  server.registerTool(
    'context_explain',
    {
      title: 'Explain a context decision',
      description:
        'Why did this fact enter the context — or not? Returns the measured relevance, support grade, conflict resolution and budget rank for one item, plus the alternatives that lost to it.',
      inputSchema: {
        task: z.string(),
        item_id: z.string().describe('Item id to explain (see capsule excluded/known ids, e.g. "deploy.method.gha").'),
        budget: z.number().int().positive().optional(),
        sources: sourcesSchema,
      },
    },
    async ({ task, item_id, budget, sources }) => {
      const { items } = await loadItems(sources);
      const { trace, alternatives } = explain(items, { task, budget, now: new Date().toISOString() }, item_id);
      if (!trace) {
        return { content: [{ type: 'text', text: `item "${item_id}" not found in sources` }] };
      }
      return {
        content: [{ type: 'text', text: renderTrace(trace, alternatives) }],
        structuredContent: { trace, alternatives },
      };
    },
  );

  server.registerTool(
    'context_diff',
    {
      title: 'Diff two compilations',
      description:
        'Compile the same sources for two tasks and diff the capsules: what entered (+), left (-), changed (→), became UNKNOWN (?), or was resolved (!).',
      inputSchema: {
        task_a: z.string(),
        task_b: z.string(),
        budget: z.number().int().positive().optional(),
        sources: sourcesSchema,
      },
    },
    async ({ task_a, task_b, budget, sources }) => {
      const { items } = await loadItems(sources);
      const result = diff(items, { task: task_a, budget, now: new Date().toISOString() }, { task: task_b, budget, now: new Date().toISOString() });
      const text = renderDiff(`"${task_a}" → "${task_b}"`, result);
      return {
        content: [{ type: 'text', text }],
        structuredContent: { lines: result.lines, summary: result.summary },
      };
    },
  );

  server.registerTool(
    'context_sources',
    {
      title: 'List sources',
      description: 'Provider inventory: what input sources are available in this environment right now, and how many items each yields.',
      inputSchema: {
        include_git: z.boolean().optional().describe('probe git state of cwd (default true)'),
      },
    },
    async ({ include_git }) => {
      const spec: SourceSpec = { static: [fixturePath('deploy-billing.json')], git: include_git ?? true };
      const { statuses } = await loadItems(spec);
      const kinds = [
        'static   — JSON item files ({items:[...]})',
        'fs       — deterministic directory walk (json/yaml/md/txt)',
        'git      — branch, HEAD, worktree state',
        'env      — BANDPASS_ITEM_<SUBJECT> variables',
        'mission  — mission checkpoint JSON (step N/M, objective, next)',
        'credence — evidence-first claim export (JSONL; support/state/evidence)',
      ].join('\n');
      return {
        content: [{ type: 'text', text: `PROVIDERS\n${statuses.map((s) => `  ${s.id}  available=${s.available}  items=${s.items}${s.error ? `  error=${s.error}` : ''}`).join('\n')}\n\nAVAILABLE KINDS\n${kinds.split('\n').map((k) => `  ${k}`).join('\n')}` }],
        structuredContent: { providers: statuses },
      };
    },
  );

  server.registerTool(
    'context_budget',
    {
      title: 'Budget curve',
      description: 'What fits at which budget: compile the task at several budgets and see selected items and estimated tokens for each. Useful for sizing a context budget honestly.',
      inputSchema: {
        task: z.string(),
        budgets: z.array(z.number().int().positive()).optional().describe('default [100, 250, 500, 1000, 1200, 2000]'),
        sources: sourcesSchema,
      },
    },
    async ({ task, budgets, sources }) => {
      const { items } = await loadItems(sources);
      const curve = (budgets ?? [100, 250, 500, 1000, 1200, 2000]).map((b) => {
        const capsule = compile(items, { task, budget: b, now: new Date().toISOString() });
        return {
          budget: b,
          used_tokens: capsule.used_tokens,
          selected: capsule.stats.selected,
          over_budget_rejected: capsule.excluded.filter((e) => e.stage === 'BUDGET').length,
        };
      });
      const text = ['BUDGET CURVE (tokens are estimates: 4 chars ≈ 1 token)', ...curve.map((c) => `  ${String(c.budget).padStart(5)} tokens → selected ${c.selected}, used ${c.used_tokens}, over-budget rejections ${c.over_budget_rejected}`)].join('\n');
      return { content: [{ type: 'text', text }], structuredContent: { curve } };
    },
  );

  server.registerTool(
    'context_status',
    {
      title: 'Server status',
      description: 'bandpass runtime facts: version, node, schema, determinism guarantee.',
      inputSchema: {},
    },
    async () => ({
      content: [
        {
          type: 'text',
          text: [
            'bandpass STATUS',
            `  version       ${VERSION}`,
            `  node          ${process.version}`,
            '  capsule schema bandpass.capsule/v1',
            '  deterministic true (compile is a pure function of task+items+budget)',
            '  writes        none (read-only tools)',
          ].join('\n'),
        },
      ],
      structuredContent: { version: VERSION, node: process.version, schema: 'bandpass.capsule/v1', deterministic: true },
    }),
  );

  return server;
}

export async function runServer(): Promise<void> {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
