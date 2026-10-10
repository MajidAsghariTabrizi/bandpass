# MCP client configuration snippets

Statuses live in the [README client matrix](../README.md#client-matrix).
VERIFIED means an automated protocol test exercised the real server
(`test/mcp-smoke.mjs` in CI). Everything below should work with any
spec-compliant stdio MCP client — help verify yours and open a PR.

## Generic (any MCP client)

```json
{
  "mcpServers": {
    "bandpass": {
      "command": "npx",
      "args": ["-y", "github:MajidAsghariTabrizi/bandpass", "mcp"]
    }
  }
}
```

Installed locally instead:

```json
{
  "mcpServers": {
    "bandpass": { "command": "npx", "args": ["bandpass", "mcp"] }
  }
}
```

## Claude Code

```bash
claude mcp add bandpass -- npx -y github:MajidAsghariTabrizi/bandpass mcp
```

## Cursor

`.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "bandpass": { "command": "npx", "args": ["-y", "github:MajidAsghariTabrizi/bandpass", "mcp"] }
  }
}
```

## What to ask once connected

- *"Compile context for deploying the billing service, budget 1200."*
- *"Why did the Jenkins deploy note not make it into the context?"*
  → `context_explain` with `item_id: deploy.method.jenkins`
- *"Diff context between deploying billing and investigating the billing DB."*
  → `context_diff`
- *"What sources are available?"* → `context_sources`

## Tools

| Tool | Input | Returns |
|---|---|---|
| `context_compile` | `task`, `budget?`, `agent?`, `sources?` | Context Capsule (rendered + structured) |
| `context_explain` | `task`, `item_id`, `budget?`, `sources?` | audit trace + same-subject alternatives |
| `context_diff` | `task_a`, `task_b`, `budget?`, `sources?` | `+ added  - removed  → changed  ? now unknown  ! resolved` |
| `context_sources` | — | provider inventory + health |
| `context_budget` | `task`, `budgets?` | selected/used at each budget |
| `context_status` | — | version, node, schema, determinism |

`sources` (all optional): `{ static: [files], fs: dir, git: bool, env: prefix, mission: file, credence: file }`.
Omitted → bundled demo corpus.
