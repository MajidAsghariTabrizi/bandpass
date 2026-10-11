# THE launch story (one story, reused everywhere — replace the generic posts)

Technical argument, not a product announcement. No hype words. Adapt length
per platform; keep the spine identical.

---

## The story

Agent stacks got very good at storing and retrieving more context. Memory
systems, vector stores, graphRAG — all of it growing.

Retrieval still leaves one ugly problem untouched:

**Who decides what is actually allowed into the context window?**

Not "find me things about billing deploys" — retrieval does that. The question
after retrieval: this Jenkins note is 7 years stale, this GitHub Actions doc is
current, this region config exists twice from two sources, this rollback-owner
rumor was mentioned in chat once, this migration owner is *unknown* — which of
these may the model believe, and which must it never see?

Every stack I used answers that question implicitly, by concatenation. The
model gets everything that matched, contradictions included.

I built Bandpass to test the opposite: **compile context, don't concatenate it.**

```text
33 raw items
   ↓ RANK      task defines the passband; 180-day recency half-life
   ↓ VERIFY    authority × evidence → grades; hearsay labeled, never asserted
   ↓ RESOLVE   one current truth per subject; losers recorded, not deleted
   ↓ COMPRESS  budget fit; unknowns reserved
= 864-token Context Capsule (est.)
```

What the capsule says that a concatenated prompt can't:

- **stale state removed** — the 2019 Capistrano note decayed out; Jenkins
  superseded by GitHub Actions, on the record
- **duplicates collapsed** — one region config, strongest source wins
- **uncertainty labeled** — the rollback-owner rumor rides as UNCERTAIN:
  visible, graded weak, never trusted
- **unknowns preserved** — "migration owner = not established" has its own
  section, so the agent inherits the question instead of hallucinating an answer
- **rejected context inspectable** — every exclusion names its stage and
  reason; you can argue with the compiler

Deterministic — same inputs, same capsule, no model calls, ~1ms. Tokens are
estimates. The benchmark is synthetic (every item's role known by construction):
naive retrieval passes 4 superseded deploy methods as current and silently
drops every unknown; compilation keeps 6/6 required facts, retires all stale
ones, keeps unknowns explicit — 1435 → 517 estimated tokens.

RAG retrieves. Memory stores. Something still has to decide.
I think that layer should be a compiler — auditable, deterministic, arguable.

**Try to break the selection logic:**
`npx github:MajidAsghariTabrizi/bandpass demo`
Lab: https://majidasgharitabrizi.github.io/bandpass/
Code: https://github.com/MajidAsghariTabrizi/bandpass

What does it get wrong on your corpus?

---

## Show HN — final submission

**Title (A/B):**
1. `Show HN: Bandpass – a context compiler for AI agents`
2. `Show HN: Bandpass – compile context, don't concatenate it`

Use #1 (plainer wins on HN).

**Body:**

I kept hitting the same wall in agent stacks: storage and retrieval keep
getting better, and then everything that matched gets concatenated into the
context window — stale facts, duplicates, two sources disagreeing, hearsay,
and no record of what was cut.

Bandpass is the layer after retrieval: a deterministic compiler. Task + sources
(memory exports, files, git state, mission checkpoints) in; a "Context Capsule"
out — known facts graded by evidence, labeled-weak uncertainties, explicit
unknowns, superseded conflicts on the record, and a rejection ledger naming
why each item was excluded. Six read-only MCP tools, a CLI, no model calls
anywhere, ~1ms compiles.

Run it now (no install):

    npx github:MajidAsghariTabrizi/bandpass demo

Interactive version: https://majidasgharitabrizi.github.io/bandpass/

How it differs from RAG/memory: those answer "what do we have / what matches".
Bandpass answers "what may this task's model believe right now" — retrieval and
memory stay; the compile step sits between them and the window.

What's deliberately unfinished (and why I'm posting):

- Relevance is lexical, not semantic — subject-match weighting, a noise gate,
  recency decay. Auditable and offline, but "the DB moved" won't match
  "database migrated". Pluggable rankers are the roadmap, behind the same
  contract.
- The benchmark is synthetic, seeded, small — composition only; I make no LLM
  quality claims because I measured none.
- Client matrix is honest: generic MCP verified by protocol test; Cursor /
  Claude Code / Codex rows are EXPERIMENTAL until someone external verifies
  (issues open, PRs welcome — literally the easiest first contributions).

The thing I actually want from HN: failure cases. Feed it your messiest corpus
and tell me where the selection logic is wrong. The rejection ledger and
per-item WHY exist so every decision is arguable — argue with them.

**First founder comment (post immediately after submitting):**

Why a separate compiler layer instead of smarter retrieval:

Retrieval optimizes similarity; the window needs judgment. Those diverge
exactly where agents break: the stale-but-similar fact outranks nothing, the
duplicate wastes budget twice, the conflict silently resolves to whichever
chunk came first, and the unknown becomes a confident guess. None of those are
similarity problems — they're curation problems, and they're deterministic
enough that I don't want an LLM in the loop re-deciding them every run.

So Bandpass treats context like a compiler treats source: rank (passband),
verify (evidence grades), resolve (one current truth per subject, losers
recorded), compress (budget). Deterministic means reproducible agent behavior
and an audit trail — when someone asks "why did the agent believe X last
Tuesday", the capsule answers, including what was excluded and why.

What I'd poke at: the lexical ranker is intentionally simple (v0.1 — you can
read the whole thing), the resolve policy is defensible but not wise
(recency-then-authority), and the token estimates are chars/4. Those are the
seams — I'd rather HN find them than pretend they're not there.

---

## Reddit placement decision (researched, not cross-posted)

- r/LocalLLaMA — fits (deterministic, local, no API). Use the launch story,
  trimmed 40%, title: "I stopped concatenating retrieval results into my
  agent's context window and wrote a compiler instead". Their rules:
  text posts from real accounts, no link-only, disclose authorship. ✓
- r/mcp — fits directly (MCP server); shorter, tool-focused version.
- r/AI_Agents — borderline (heavier self-promo rules); only if the first two
  get technical engagement.
- Skip the rest. Two communities, one story each, days apart.
