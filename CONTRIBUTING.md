# Contributing to bandpass

Thanks for helping compile context instead of concatenating it.

## Dev loop

Requires Node ≥ 20 (CI tests 22 and 24). No API keys, no model calls —
everything is deterministic and offline.

```bash
git clone https://github.com/MajidAsghariTabrizi/bandpass
cd bandpass
npm install
npm run verify
```

`npm run verify` runs, in seconds:

- typecheck (`tsc --noEmit`)
- build + **35 unit tests** (`node --test dist/`)
- demo smoke (deterministic output, machine-checkable)
- benchmark smoke (2 tasks, asserts compiler behavior)
- **MCP protocol smoke** — spawns the real server, JSON-RPC handshake, lists
  all six tools, calls each one over stdio
- lab sync check (the interactive Lab must match the real compiler output)

## Layout

| Path | What |
|---|---|
| `src/` | compiler, providers, MCP server, CLI (TypeScript → `dist/`) |
| `src/*.test.ts` | unit tests (run from `dist/`) |
| `fixtures/` | the deterministic demo corpus |
| `bench/run.mjs` | RAW vs RETRIEVAL vs COMPILE benchmark |
| `test/mcp-smoke.mjs` | MCP wire-protocol smoke |
| `lab/` | static interactive Lab (GitHub Pages) |
| `scripts/sync-lab.mjs` | regenerates `lab/corpus.js` from the real compiler |
| `docs/` | architecture, capsule format, providers, launch log |

## Rules of the house

1. **Determinism is the product.** No clock reads, randomness or I/O inside
   the pipeline. Latency belongs to the caller.
2. **Every exclusion needs a reason** a human can read. If you add a rejection
   path, you add its record.
3. **No model calls, ever, in the compiler.** bandpass compiles context for
   models; it does not use them.
4. **Tokens are estimates** and every number we print says so.
5. **Tests ship with the feature.** New pipeline behavior → new test in
   `src/*.test.ts`; new MCP tool → extend `test/mcp-smoke.mjs`.
6. **Lab must never fork the logic.** Visualize the compiler's actual output —
   `npm run lab:sync` regenerates the corpus; CI fails if it drifts.

## Changing the Lab

Edit `lab/index.html`, `lab/lab.css`, `lab/lab.js` — plain vanilla JS, no
build step. The data lives in `lab/corpus.js` and is generated:

```bash
npm run lab:sync     # after touching fixtures or the compiler
```

## Good first issues

Start [here](https://github.com/MajidAsghariTabrizi/bandpass/labels/good%20first%20issue) —
each issue lists problem, relevant files, expected behavior, acceptance
criteria and the test command.

## Commit style

Conventional-ish, imperative: `resolve: keep newest duplicate as winner`,
`mcp: add context_budget`, `docs: honest limitations`. Small diffs beat big ones.
