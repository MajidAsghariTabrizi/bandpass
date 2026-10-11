# Wave-1 outreach queue — 10 real people, individually written

Every target verified active in Oct 2026 via GitHub search. Send from the
owner's account. One message each; no follow-up before 7 days; log below.

| # | TARGET | SENT? | REPLIED? | TRIED? | FEEDBACK | FOLLOW-UP |
|---|---|---|---|---|---|---|
| 1 | @muskfeel (openclaw issue) | BLOCKED — issue locked as stale; owner contact via profile email instead | — | — | — | — |
| 1b | @YingzuoLiu (did the live repro on that issue) | — | — | — | — | — |
| 2 | @sunnweiwei (relay) | — | — | — | — | — |
| 3 | @Jakedismo (codegraph-rust) | — | — | — | — | — |
| 4 | @alex-feel (mcp-context-server) | — | — | — | — | — |
| 5 | @esatt10 (pheasant-kb) | — | — | — | — | — |
| 6 | @filippo-mancinelli (context-forge) | — | — | — | — | — |
| 7 | @lixiaochuan2020 (ACM paper) | — | — | — | — | — |
| 8 | @PeterGuy326 (roleweave) | — | — | — | — | — |
| 9 | @opentendril (opentendril) | — | — | — | — | — |
| 10 | @Jeffallan (memory-reconcile) | — | — | — | — | — |

---

## 1. @muskfeel — openclaw memory issue (comment blocked — thread locked)

- **Project:** openclaw/openclaw
- **Why relevant:** filed "Memory system: Cannot delete stale memories, conflicting entries persist" — active 2026-10-11
- **Surface:** issue #95606 is **locked** (auto-closed stale) — the prepared comment couldn't post. Owner: contact via their GitHub profile email, referencing their issue.
- **Message (adapt for email):**

> Saw your openclaw issue about stale + conflicting memories both surviving recall — that exact failure (correction stored as a new row instead of replacing the old one) is what pushed me to build correction as resolution rather than deletion: one current item per subject (explicit supersession → recency → authority), losers kept in a visible superseded register so you never need fuzzy `memory_forget`.
>
> Runnable 30s demo of that stage: `npx github:MajidAsghariTabrizi/bandpass demo`
>
> Not asking you to adopt it — I'd value you trying to break the resolution logic, since you've clearly hit the real-world version of the problem.

## 1b. @YingzuoLiu — the repro contributor

- **Project:** did a careful live repro on openclaw#95606 (memory-lancedb, Ollama embeddings)
- **Why relevant:** demonstrably invests in memory-correctness debugging — same audience, high signal
- **Surface:** GitHub profile email or their repos' discussions
- **Message:** same core as 1, referencing their repro: "your LanceDB repro isolates exactly the layer where one-current-truth-per-subject resolution would fix it — I built that stage standalone; would value your attempt to break it."

## 2. @sunnweiwei — relay

- **Project:** sunnweiwei/relay — "middleware for agent context management", updated 2026-10-11 (today)
- **Why relevant:** building the same layer class; bandpass is a possible engine behind middleware like relay
- **Surface:** relay repo issue/discussion or profile email
- **Message:**

> Saw relay while looking at agent-context middleware — "middleware for context management" is exactly the layer I keep wishing agent stacks had, so I'm curious how you're scoping it.
>
> I've been testing a different split of that layer: instead of middleware that injects, a compiler that decides — task in, ranked/verified/conflict-resolved/budget-fitted capsule out, with a rejection ledger so every exclusion is arguable. No model calls, deterministic.
>
> 30s: `npx github:MajidAsghariTabrizi/bandpass demo`
>
> If you have 10 minutes, I'd genuinely value you trying to break the selection logic — what kinds of items would your middleware see that lexical ranking + recency decay would mishandle?

## 3. @Jakedismo — codegraph-rust

- **Project:** Jakedismo/codegraph-rust — Rust code graphRAG "for efficient code agent context management", updated 2026-10-10
- **Why relevant:** has the retrieval half; bandpass is the decide-what-enters half
- **Surface:** repo discussions/issues
- **Message:**

> Your codegraph-rust came up while surveying code-agent context tooling — AST-level graphRAG answers "what's in the codebase" far better than chunk-vector RAG, and I keep hitting the next problem after it: retrieval returns candidates, but something still has to decide what actually enters the window — stale vs current, duplicates, conflicts, unknowns.
>
> I built that decision layer as a standalone compiler (deterministic, no model calls): RANK → VERIFY → RESOLVE → COMPRESS, every rejection on the record. `npx github:MajidAsghariTabrizi/bandpass demo` shows it on a 33-item corpus (stale Jenkins note superseded, duplicate collapsed, hearsay labeled, unknowns kept).
>
> Would graphRAG output map cleanly onto item {subject, content, authority, evidence, observed_at} in your view? That's the adapter question I care most about — happy to spec it if useful.

## 4. @alex-feel — mcp-context-server

- **Project:** alex-feel/mcp-context-server — FastMCP persistent multimodal context storage, updated 2026-10-10
- **Why relevant:** storage+MCP done; selection/budgeting is the open half
- **Surface:** repo issues
- **Message:**

> Also running an MCP context server (bandpass) — yours does persistent multimodal storage; mine deliberately does none, and only compiles what a given task should receive: evidence grades, supersession, token budget, explicit unknowns, and a rejection ledger.
>
> Demo: `npx github:MajidAsghariTabrizi/bandpass demo` · six read-only tools, stdio.
>
> Curious whether you've felt the need for a per-task selection pass over stored context, or whether storage-side recency is enough in practice. If you want to break my selection logic, that's the feedback I'm hunting.

## 5. @esatt10 — pheasant-kb

- **Project:** esatt10/pheasant-kb — Docker-first local-first MCP context server, "deterministic incremental indexing", updated 2026-10-07
- **Why relevant:** deterministic + local-first are bandpass's exact values; natural composition
- **Surface:** repo issues/discussions
- **Message:**

> pheasant's "deterministic incremental indexing" is the first phrase in this space that matched how I think about it — same reason bandpass is deterministic end-to-end (same inputs → same capsule; no model calls anywhere).
>
> Mine is the step after your index: given the task, compile what enters the window — rank/verify/resolve/compress, rejection ledger included, unknowns kept explicit instead of guessed over.
>
> `npx github:MajidAsghariTabrizi/bandpass demo` — I'd value a hostile review of the selection logic. What breaks in pheasant's corpus shapes that my lexical pass would mishandle?

## 6. @filippo-mancinelli — context-forge

- **Project:** filippo-mancinelli/context-forge — self-hosted context server (pgvector, semantic code search) for coding agents, updated 2026-09-30
- **Surface:** repo issues
- **Message:**

> context-forge and bandpass sit at the same seam from opposite sides — you index and search; I compile the final window: task-scoped capsule, conflict resolution (stale Jenkins note vs current GitHub Actions method), token budget, unknowns preserved, every rejection recorded with a reason.
>
> Deterministic, ~1ms, MCP: `npx github:MajidAsghariTabrizi/bandpass demo`
>
> Question from your side of the seam: does semantic search make a compile step redundant, or do you still see conflicting/stale hits reaching the agent? I'd genuinely like your read — and failure cases if you try the demo.

## 7. @lixiaochuan2020 — ACM paper repo

- **Project:** lixiaochuan2020/agentic-context-management — official repo of "ACM: Agentic Context Management for Long-Horizon Tasks" (arXiv 2607.23809), updated 2026-10-04
- **Why relevant:** researcher formalizing the exact problem; bandpass is a small deterministic artifact in that space
- **Surface:** repo issue (question/discussion) or email from paper
- **Message:**

> Read the ACM paper's framing of agentic context management for long-horizon tasks — the gap between "what the system state contains" and "what the model should receive per turn" is the one I've been hacking on from the engineering side.
>
> bandpass is a deliberately small take: deterministic compilation (rank → verify → resolve → compress), no learned components, every rejection inspectable — closer to a reference artifact than a system. If it's useful as a baseline or a counterpoint in your evaluation, that's the intent.
>
> `npx github:MajidAsghariTabrizi/bandpass demo` · happy to adapt the capsule format to your evaluation harness if that's interesting.

## 8. @PeterGuy326 — roleweave memory plane

- **Project:** bytefolk/roleweave — "feat(memory): define the RoleWeave memory plane for bounded context, archival, and multi-agent recall", 2026-09-24
- **Why relevant:** designing a bounded-context memory plane — the selection policy IS bandpass
- **Surface:** the roleweave memory issue/PR thread
- **Message:**

> Saw the memory-plane design work in roleweave — bounded context + archival + recall is exactly the three-way split I've been implementing on the "bounded" leg.
>
> bandpass compiles the bounded part per task: relevance band, evidence grades, one-current-truth-per-subject resolution, token budget, and an explicit UNKNOWN section so the gap is inherited, not hallucinated. The rejection ledger keeps every exclusion arguable.
>
> Demo: `npx github:MajidAsghariTabrizi/bandpass demo` · capsule spec: docs/CAPSULE.md
>
> If the plane needs a selection policy, steal the semantics shamelessly — or point at what they get wrong for your multi-agent case.

## 9. @opentendril — provenance-backed cognition

- **Project:** opentendril/opentendril — "[IMPL PLAN] Provenance-backed persistent repository cognition", 2026-09-24
- **Why relevant:** provenance is bandpass's per-item core field; same worldview
- **Surface:** their IMPL PLAN issue thread
- **Message:**

> Your provenance-backed repository cognition plan overlaps hard with the bet behind bandpass: every context item carries (source, support grade, authority, evidence count, observed_at), so "why did the agent believe that" is answerable per-fact, not per-session.
>
> bandpass is the compiler built on those fields — rank/verify/resolve/compress into a budget-bounded capsule, supersession on the record, unknowns explicit. Deterministic, no model calls.
>
> `npx github:MajidAsghariTabrizi/bandpass demo`
>
> Would value your critique of the provenance model — especially what repository cognition needs that per-item provenance misses.

## 10. @Jeffallan — memory-reconcile skill

- **Project:** Jeffallan/claude-skills — "[SKILL] memory-reconcile", 2026-10-01
- **Why relevant:** reconciling conflicting memories is bandpass's RESOLVE stage as a skill
- **Surface:** the skill repo/thread
- **Message:**

> Saw memory-reconcile in your claude-skills — reconciliation of conflicting memories is the stage I ended up building as a deterministic compiler step, because LLM-judged reconciliation drifted on me.
>
> bandpass RESOLVE: same-subject conflicts resolve by explicit supersession → recency → authority, losers recorded (× Jenkins method, superseded by GitHub Actions — visible, not deleted). Hearsay is labeled and kept visible as UNCERTAIN; unknowns stay unknown.
>
> `npx github:MajidAsghariTabrizi/bandpass demo`
>
> Curious how the skill approach handles the "confident about stale fact" failure — that's the case that pushed me deterministic.
