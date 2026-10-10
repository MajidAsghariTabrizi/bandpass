# Changelog

All notable changes to bandpass are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · SemVer.

## [0.1.0] — 2026-10-05

### Added

- **Context Capsule** format `bandpass.capsule/v1`: KNOWN / UNCERTAIN / UNKNOWN /
  SUPERSEDED / MISSION sections, per-item provenance (source, support grade,
  relevance, authority, evidence) and a full rejection ledger with stages and reasons.
- **Compiler pipeline**: RANK (lexical relevance, subject×2 weighting, noise gate,
  180-day recency half-life) → VERIFY (authority×evidence support grades;
  on-topic hearsay surfaced as UNCERTAIN) → RESOLVE (dedup to strongest source,
  explicit supersession chains, recency→authority conflict resolution with
  recorded losers) → COMPRESS (budget fitting with reserved mission/unknowns,
  overflow rejected with rank).
- **MCP server** (`bandpass mcp`), six read-only tools over stdio:
  `context_compile`, `context_explain`, `context_diff`, `context_sources`,
  `context_budget`, `context_status`. Protocol smoke-tested in CI.
- **CLI**: `demo` (deterministic 30-second tour), `compile`, `explain`, `diff`, `mcp`.
- **Providers**: static (JSON), filesystem walk, git state, env vars,
  mission checkpoint, credence claim-export adapter.
- **Deterministic benchmark** (RAW vs RETRIEVAL vs COMPILE over seeded synthetic
  corpora) — see `bench/BENCHMARK.md`.
- **Interactive Lab** (GitHub Pages): live compile animation, relevance spectrum,
  capsule render with per-item WHY, rejection ledger, capsule diff.
- 35 unit tests + demo/bench/MCP/lab smoke gates; gitleaks in CI.

### Notes

- Token counts are estimates (4 chars ≈ 1 token). No LLM quality claims are made.
- Relevance is lexical in v0.1 (no embeddings) — by design: auditable and offline.

[0.1.0]: https://github.com/MajidAsghariTabrizi/bandpass/releases/tag/v0.1.0
