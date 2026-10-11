# Launch metrics — funnel & daily capture

Honest numbers only. Baseline captured 2026-10-10 (day 0 of distribution).
No vanity metrics: a stranger running the demo is traction; an accepted upstream
PR is traction; a new SVG is not.

| Metric | Baseline (2026-10-10) | Current | Target |
|---|---:|---:|---:|
| Stars | 0 | 0 | 50 |
| Unique visitors (14d) | 0 | — | — |
| Clones (14d) | 0 | — | — |
| Forks | 0 | 0 | 2 |
| External issues/PRs/discussions | 0 | 0 | 3 |
| Real testers (ran the demo, gave feedback) | 0 | 0 | 10 |
| External mentions | 0 | 0 | 5 |
| Upstream placements accepted | 0 of 4 open | 0 | 3 |
| Verified client integrations | 1 (generic MCP, protocol test) | 1 | 3+ |

## Daily capture (2 minutes, from repo root)

```bash
gh repo view MajidAsghariTabrizi/bandpass --json stargazerCount,forkCount
gh api repos/MajidAsghariTabrizi/bandpass/traffic/views
gh api repos/MajidAsghariTabrizi/bandpass/traffic/clones
gh api repos/MajidAsghariTabrizi/bandpass/traffic/popular/referrers
gh pr list --repo Meirtz/Awesome-Context-Engineering --search "bandpass"
gh pr list --repo aglio-lab/context-engineering-tools --search "bandpass"
gh pr list --repo yzfly/awesome-context-engineering --search "bandpass"
gh pr list --repo punkpeye/awesome-mcp-servers --search "bandpass"
```

Record each day as a new row above (update the Current column, add date).
GitHub traffic data only exposes the last 14 days — capture daily or lose it.

## Search visibility (retest weekly)

Queries tested 2026-10-10 — bandpass NOT returned for any (0 stars, no engagement
signal yet; indexing follows attention). "context compiler" already returns
competitors (aegis, one-context, codectx, mcp-context-forge) — the category
language exists, we don't have the ranking.

- [ ] `context compiler`
- [ ] `context compiler ai agents`
- [ ] `agent context management`
- [ ] `context engineering agent`
- [ ] `MCP context`
- [ ] `agent memory context`
- [ ] `token context management`
- [ ] `RAG context selection`

## Rules

- Never purchase or trade any metric.
- Testers count only if they ran something and said so publicly or in writing.
- "External" means not from MajidAsghariTabrizi accounts.
