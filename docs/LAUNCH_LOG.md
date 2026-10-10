# Launch log

Public launch record for bandpass. Numbers are read from the repository at
the time of the entry — no vanity metrics, no bought stars, ever.

| date | channel | asset | stars before | stars after | forks | external issues | external users | notes |
|---|---|---|---|---|---|---|---|---|
| 2026-10-05 | repository created | — | 0 | 0 | 0 | 0 | 0 | v0.1.0 first push: compiler, MCP server, Lab, benchmark, CI |
| 2026-10-10 | public launch | — | 0 | 0 | 0 | 6 open (internal) | 0 | CI green (node 22/24 + gitleaks); Pages live; release v0.1.0; issues #1–#6 seeded; quickstart `npx github:…` verified end-to-end |
| 2026-10-10 | social preview | manual step pending | — | — | — | — | — | API endpoint 404s; upload `docs/assets/social-preview.png` via web UI (Settings → Social preview) |
| 2026-10-10 | awesome list | [Meirtz/Awesome-Context-Engineering#130](https://github.com/Meirtz/Awesome-Context-Engineering/pull/130) | 0 | 0 | 0 | 0 | 0 | one genuine PR, entry in Context Optimization Engines, follows list format |

## Prepared discovery submissions

Follow each list's contribution rules; do not spam. One PR per list, spaced out.

- [ ] awesome-context-engineering (submit: `README.md` link entry)
- [ ] awesome-agent-memory / awesome-llm-agents (submit: link entry under tools/memory)
- [ ] MCP server directories (modelcontextprotocol/servers is for reference servers —
      prefer community directories that accept third-party servers)
- [ ] relevant dev communities (Hacker orbit: Show HN draft in `docs/launch/show-hn-draft.md`)

## Content wave (prepared, publish manually)

1. **50,000 tokens in. 742 tokens out.** — only with actually measured numbers;
   today's honest version is the benchmark: **1435 in → 517 out, 0 stale, 0 duplicates, unknowns kept**.
   Hook: *"I stopped giving my agent its history. I started compiling its context."*
2. **Show the rejections.** — the rejection ledger screenshot from the Lab.
   Hook: *"The most important part of context engineering may be what you leave out."*
3. **The stale contradiction.** — Jenkins → SUPERSEDED → GitHub Actions.
   Hook: *"Retrieval found both. The context compiler chose the one that's still true."*
4. **UNKNOWN stays unknown.** — the UNKNOWN section.
   Hook: *"Missing context should stay missing. It shouldn't become a confident guess."*

## Rules

- Never buy/trade/bot stars, users, benchmarks or testimonials.
- Stars are a lagging indicator; external issues and PRs are the real signal.
- Update this file at every meaningful channel event.
