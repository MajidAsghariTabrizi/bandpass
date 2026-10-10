#!/usr/bin/env node
/**
 * bandpass CLI.
 *
 *   bandpass demo                                  — the 30-second tour
 *   bandpass compile --task "deploy billing"       — compile from sources
 *   bandpass explain --task "..." --item <id>      — why one fact is in/out
 *   bandpass diff --task-a "..." --task-b "..."    — what changed
 *   bandpass mcp                                   — start the MCP server
 */

import { runDemo } from './demo.js';
import { compile } from './compile.js';
import { renderCapsule, renderExclusions } from './capsule.js';
import { explain, renderTrace } from './explain.js';
import { diff, renderDiff } from './diff.js';
import { buildProviders, collectAll, type SourceSpec } from './providers/index.js';
import { fixturePath } from './paths.js';
import { runServer } from './mcp/server.js';
import { VERSION } from './version.js';

interface Args {
  command: string;
  flags: Map<string, string | boolean>;
  positional: string[];
}

function parseArgs(argv: string[]): Args {
  const flags = new Map<string, string | boolean>();
  const positional: string[] = [];
  let i = 0;
  let command = '';
  while (i < argv.length) {
    const arg = argv[i]!;
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags.set(key, next);
        i += 2;
      } else {
        flags.set(key, true);
        i += 1;
      }
    } else {
      if (command === '') command = arg;
      else positional.push(arg);
      i += 1;
    }
  }
  return { command, flags, positional };
}

function parseSources(flags: Map<string, string | boolean>): SourceSpec {
  const spec: SourceSpec = {};
  const raw = flags.get('source');
  const paths = typeof raw === 'string' ? [raw] : Array.isArray(raw) ? raw : [];
  for (const p of paths) {
    if (p.startsWith('credence:')) spec.credence = p.slice('credence:'.length);
    else if (p.startsWith('mission:')) spec.mission = p.slice('mission:'.length);
    else if (p.startsWith('fs:')) spec.fs = p.slice('fs:'.length);
    else if (p.startsWith('static:')) (spec.static ??= []).push(p.slice('static:'.length));
    else if (p === 'git') spec.git = true;
    else if (p.endsWith('.jsonl')) spec.credence = p;
    else (spec.static ??= []).push(p);
  }
  if (flags.get('git') === true) spec.git = true;
  return spec;
}

const HELP = `bandpass v${VERSION} — the context compiler for AI agents

USAGE
  bandpass demo [--json | --smoke]
  bandpass compile --task "..." [--budget 1200] [--source <path>]... [--format text|json] [--agent <name>]
  bandpass explain --task "..." --item <id>    [--source <path>]...
  bandpass diff   --task-a "..." --task-b "..." [--source <path>]...
  bandpass mcp

SOURCES (--source), repeatable:
  static:<file.json>    JSON item file ({items:[...]})
  fs:<dir>              directory walk (json/yaml/md/txt become items)
  credence:<claims.jsonl>  evidence-first claim export (support/state/evidence)
  mission:<mission.json>   mission checkpoint (step N/M, objective, next)
  git                   current repo state (branch/HEAD/worktree)
  <file.json>           shorthand for static:<file.json>
  Omitted sources default to the bundled demo corpus.

EXAMPLES
  bandpass demo
  bandpass compile --task "deploy billing service" --budget 800
  bandpass compile --task "ship hotfix" --source fs:. --source git
  bandpass explain --task "deploy billing service" --item deploy.method.gha
  bandpass diff --task-a "deploy billing" --task-b "migrate billing db"
  bandpass mcp      # MCP server on stdio: context_compile, context_explain, ...

Tokens are estimates (4 chars ≈ 1 token). Compilation is deterministic:
same task + same items + same budget → same capsule. https://github.com/MajidAsghariTabrizi/bandpass`;

async function main(): Promise<number> {
  const { command, flags } = parseArgs(process.argv.slice(2));

  if (flags.get('version') === true || command === 'version') {
    console.log(VERSION);
    return 0;
  }
  if (flags.get('help') === true || command === 'help' || command === '') {
    console.log(HELP);
    return 0;
  }

  if (command === 'demo') {
    const result = runDemo({ json: flags.get('json') === true, smoke: flags.get('smoke') === true });
    console.log(result.output);
    return 0;
  }

  if (command === 'mcp') {
    await runServer();
    return 0;
  }

  if (command === 'compile' || command === 'explain' || command === 'diff') {
    const sources = parseSources(flags);
    const useDefaults = Object.keys(sources).length === 0;
    const spec: SourceSpec = useDefaults ? { static: [fixturePath('deploy-billing.json')] } : sources;
    const providers = buildProviders(spec);
    const { items, statuses } = await collectAll(providers);
    const budget = typeof flags.get('budget') === 'string' ? Number(flags.get('budget')) : undefined;
    const task = String(flags.get('task') ?? '');

    if (command === 'compile') {
      if (!task) {
        console.error('error: --task is required');
        return 1;
      }
      const agentFlag = flags.get('agent');
      const capsule = compile(items, { task, budget, agent: typeof agentFlag === 'string' ? agentFlag : undefined });
      if (flags.get('format') === 'json') {
        console.log(JSON.stringify(capsule, null, 2));
      } else {
        console.log(renderCapsule(capsule));
        console.log('');
        console.log(renderExclusions(capsule));
      }
      return 0;
    }

    if (command === 'explain') {
      const item = String(flags.get('item') ?? '');
      if (!task || !item) {
        console.error('error: --task and --item are required');
        return 1;
      }
      const { trace, alternatives } = explain(items, { task, budget }, item);
      if (!trace) {
        console.error(`error: item "${item}" not found in sources`);
        return 1;
      }
      console.log(renderTrace(trace, alternatives));
      return 0;
    }

    // diff
    const taskA = String(flags.get('task-a') ?? '');
    const taskB = String(flags.get('task-b') ?? '');
    if (!taskA || !taskB) {
      console.error('error: --task-a and --task-b are required');
      return 1;
    }
    const result = diff(items, { task: taskA, budget }, { task: taskB, budget });
    console.log(renderDiff(`"${taskA}" → "${taskB}"`, result));
    return 0;
  }

  console.error(`unknown command: ${command}\n\n${HELP}`);
  return 1;
}

process.exitCode = await main();
