# The stack — and where bandpass sits

Three independent open-source projects that compose into one story.
**Each is useful alone; none requires the others.**

```text
┌────────────────────────────────────────────────────────────────────┐
│ CREDENCE — evidence-first agent memory                              │
│ what is known, and why (graded support, supersession history,      │
│ explicit UNKNOWNs, missions that survive kill -9)                  │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ claim export (JSONL, documented interface)
┌──────────────────────────────▼─────────────────────────────────────┐
│ BANDPASS — the context compiler                                    │
│ what the agent should receive right now, for this task, in budget  │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ Context Capsule (over MCP / CLI / SDK)
┌──────────────────────────────▼─────────────────────────────────────┐
│ AGENT / HARNESS — execution                                        │
│ any MCP-speaking client or framework (Claude Code, Cursor, Codex,  │
│ your own)                                                          │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ model calls
┌──────────────────────────────▼─────────────────────────────────────┐
│ FREE-BEST-ROUTER — model routing                                   │
│ discovers, health-checks and routes to the best available free     │
│ AI models                                                          │
└────────────────────────────────────────────────────────────────────┘
```

| Project | One-liner (its own) | Layer | Works without the others? |
|---|---|---|---|
| [credence](https://github.com/MajidAsghariTabrizi/credence) | evidence-first agent memory and durable mission runtime | memory & belief | yes |
| [bandpass](https://github.com/MajidAsghariTabrizi/bandpass) | the context compiler for AI agents | context compilation | yes — files/git/state providers need no memory at all |
| [free-best-router](https://github.com/MajidAsghariTabrizi/free-best-router) | intelligent router for the best available free AI models | model routing | yes |

## The story in three sentences

credence knows what is known and why. bandpass decides what the agent should
know *right now*. The router decides which model should hear it.

Together: evidence-grade memory → task-scoped context → free best model.
Apart: each does its one job for whatever stack you already run.
