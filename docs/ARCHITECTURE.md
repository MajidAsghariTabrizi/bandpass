# Architecture

```text
RAW SOURCES
     │
     ▼
COLLECT ──── providers yield Items (id, subject, content, authority,
     │        evidence, observed_at, supersedes, kind)
     ▼
RANK ─────── task tokens × subject (×2) + content; 180-day recency
     │        half-life when `now` is provided; mission=1.0,
     ▼        on-subject unknowns floor at 0.4
VERIFY ───── authority + evidence → VERIFIED / CORROBORATED / OBSERVED /
     │        INFERRED / HEARSAY; off-topic hearsay rejected,
     ▼        on-topic hearsay surfaced as UNCERTAIN (labeled, not asserted)
RESOLVE ──── dedup by normalized content (strongest source wins);
     │        explicit supersession chains; conflicts resolve by
     ▼        recency → authority → evidence → id; losers recorded
COMPRESS ── mission + unknowns reserved; facts in relevance → support
     │        order; every overflow rejected with its rank
     ▼
CONTEXT CAPSULE  (bandpass.capsule/v1)
```

## Design invariants

1. **Compilation is pure.** `compile(items, {task, budget, now?, …})` is a
   deterministic function. No clock reads, no randomness, no I/O inside the
   pipeline. Latency is measured *outside* the capsule and never affects content.
2. **Exclusion is first-class.** Every rejected item carries a stage
   (`RANK|VERIFY|RESOLVE|BUDGET`), a reason and a human-readable detail.
   The rejection ledger is part of the output, not a log line.
3. **Provenance rides along.** Every admitted item carries `source`,
   `support`, `relevance`, `authority`, `evidence`, `observed_at`.
4. **Unknowns stay unknown.** `kind: "unknown"` items never resolve into
   facts; they render in their own section so the agent inherits the gap,
   not a hallucination.
5. **Budgets measure what the agent receives.** `used_tokens` estimates the
   rendered agent-facing capsule (header + KNOWN + UNCERTAIN + UNKNOWN +
   MISSION). The SUPERSEDED register and rejection ledger are inspection
   surfaces and do not consume budget.
6. **Tokens are estimates** (4 chars ≈ 1 token). No tokenizer, no model calls.

## Module map

| Module | Responsibility |
|---|---|
| `src/rank.ts` | tokenize, rankItem/rankAll, recency decay |
| `src/verify.ts` | gradeSupport (authority × evidence) |
| `src/resolve.ts` | dedup, supersession, conflict resolution + records |
| `src/compress.ts` | budget-fitting greedy pass with measure callback |
| `src/capsule.ts` | buildCapsule, renderCapsule, renderAgentContext, renderExclusions |
| `src/compile.ts` | orchestrator; `compile` + `compileDetailed` (stage internals for explain) |
| `src/explain.ts` | per-item trace + same-subject alternatives |
| `src/diff.ts` | capsule diff (`+ - → ? !`) |
| `src/providers/` | Provider contract + static/fs/git/env/mission/credence |
| `src/mcp/server.ts` | six read-only MCP tools over stdio |
| `src/cli.ts` | `demo` / `compile` / `explain` / `diff` / `mcp` |
| `src/demo.ts` | the deterministic demo scenario (bundled fixture) |

## Determinism guarantees

- `resolve()` tie-break order: `observed_at` → `authority` → `evidence` → `id`.
- Candidate ordering in COMPRESS: relevance ↓ → support ↓ → id ↑.
- Exclusion ledger sorted by stage then id.
- Demo output is byte-identical across runs (latency goes to stderr).
- Benchmark: seeded PRNG (mulberry32, seeds 42..53), fixed reference time.
- CI asserts all of the above (`node --test dist/`, `demo --smoke`, `bench --smoke`).

## Why lexical ranking (for now)

v0.1 ranks lexically: subject matches count double, a single content-token
collision without a subject match is treated as noise and rejected, and
recency decays scores with a 180-day half-life. This is transparent, free,
offline and auditable — every score is explainable by listing matched tokens.
Embedding/hybrid rankers are roadmap items behind the same `rankAll` contract;
the rest of the pipeline (verify/resolve/compress/explain) does not care how
scores were produced.
