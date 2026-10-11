# Prepared posts — publish manually, spaced days apart, builder voice

Do NOT post all at once. Do NOT post identical text anywhere. Each network
gets its own version. Never ask for stars — ask whether the abstraction holds.

## 1. Hacker News (Show HN)

Ready at `show-hn-draft.md`. Post Tuesday–Thursday morning ET.
First comment from the author should be the design-decision comment:
lexical ranking with a recency half-life (auditable, offline), one current
truth per subject, visible exclusion — and what's deliberately NOT claimed
(no LLM quality numbers, tokens are estimates).

## 2. Reddit — r/LocalLLaMA (text post)

**Title:** I stopped stuffing my agent's memory into its context window and started compiling it instead — 33 sources in, a 864-token capsule out

**Body:**

Every agent stack I've used solves storage and retrieval, then dumps the
results into the context window and hopes. Stale facts, duplicates, two
sources disagreeing, hearsay, 60 irrelevant items — all in, no opinion.

bandpass (MIT, TypeScript, MCP) is the opposite end: a compiler. Give it a
task and sources (memory exports, files, git state, mission checkpoints) and
it emits a Context Capsule: evidence-graded knowns, labeled-weak uncertains,
explicit unknowns, superseded conflicts on the record, and a rejection ledger
that says why each item was left out. Deterministic — no model calls, ~1ms.

The benchmark I could defend: on synthetic corpora where every item's role is
known by construction, naive retrieval passes 4 superseded "deploy method"
facts as current and silently drops every unknown; compilation keeps 6/6
required, retires all stale, keeps unknowns explicit (1435 → 517 estimated
tokens). No LLM quality claims — I didn't measure any.

Demo: `npx github:MajidAsghariTabrizi/bandpass demo`
Lab: https://majidasgharitabrizi.github.io/bandpass/
Code: https://github.com/MajidAsghariTabrizi/bandpass

RAG retrieves. Something still has to decide. Does this layer make sense, or
am I rebuilding what your stack already does?

## 3. Short post — "Memory is not context" (X/LinkedIn/Mastodon)

Your memory can be perfect and your agent still gets the wrong context,
because memory answers "what do we know" and the window needs "what matters
NOW for THIS task."

Different question. Different layer.

I built that layer: a context compiler. RANK → VERIFY → RESOLVE → COMPRESS,
every rejection on the record, unknowns kept honest.

33 sources in. 864-token capsule out.

https://github.com/MajidAsghariTabrizi/bandpass

## 4. Short post — "The stale fact problem"

The dangerous item in your agent's context isn't the missing one — it's the
stale one it believes.

Retrieval returns Jenkins AND GitHub Actions. Both matched. No opinion.

A compiler retires the loser and records why: superseded, on the record,
out of the window.

That's one stage of bandpass, the context compiler for agents:
https://github.com/MajidAsghariTabrizi/bandpass

## 5. Short post — "UNKNOWN is a context primitive"

The worst thing in an agent's context window isn't a gap. It's a confident
guess where the gap should be.

bandpass compiles unknowns explicitly: "migration owner = not established"
rides in its own section so the agent inherits the question, not a
hallucination.

? > ~

https://github.com/MajidAsghariTabrizi/bandpass
