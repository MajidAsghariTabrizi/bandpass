# Show HN draft (publish manually — do not automate)

**Title:** Show HN: Bandpass – a context compiler for AI agents (MCP)

**Text:**

Most agent stacks do the same thing: store more, retrieve more, stuff more
into the context window. I built the opposite — a compiler.

Bandpass takes raw sources (memory exports, files, git state, mission
checkpoints, an evidence store) and compiles the smallest context that still
makes the task solvable: a "Context Capsule" with known facts (graded by
evidence), labeled-weak uncertainties, explicit unknowns, superseded conflicts
on the record — and a rejection ledger that says exactly why each item was
left out.

It's deterministic (same inputs → same capsule, no model calls), runs locally
in ~1ms, and ships as an MCP server with six tools (context_compile,
context_explain, context_diff, ...), a CLI, and an interactive lab:

- repo: https://github.com/MajidAsghariTabrizi/bandpass
- lab: https://majidasgharitabrizi.github.io/bandpass/
- 30s demo: `npx github:MajidAsghariTabrizi/bandpass demo`

Benchmark on synthetic corpora where every item's role is known by
construction: naive retrieval passes 4 superseded "deploy method" facts as
current and silently drops every unknown; compilation keeps 6/6 required
facts, retires all stale ones, and keeps unknowns explicit — 1435 raw tokens
vs 517 compiled (estimates; no LLM quality claims, none measured).

Happy to talk about the design: lexical ranking with a recency half-life
(auditable, offline), one-current-truth-per-subject resolution, and why I
think visible exclusion is the missing primitive in context engineering.
