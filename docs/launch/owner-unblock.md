# Owner unblock list — two 5-minute actions that unlock the funnel

Both require authenticated web actions only the owner can perform.
Everything machine-executable is already done and verified.

## 1. npm publish (unlocks `npx bandpass demo`)

Package is fully prepared and verified: name `bandpass` is FREE on the registry
(404 as of 2026-10-11), tarball is 51 files with zero test/map leakage, and a
clean-room `npm install <tarball> && npx bandpass demo --smoke` passes
(SMOKE OK, 33→19, 864/1200).

```text
COMMAND TO RUN:
  cd D:\PycharmProjects\pythonProject\bandpass
  npm login                       # browser auth as owner
  npm publish                     # publishes 0.1.0 (name unscoped, public)

EXPECTED RESULT:
  + bandpass@0.1.0
  (registry page live within ~1 min: https://www.npmjs.com/package/bandpass)

VERIFICATION COMMAND (run from any EMPTY temp directory, not the repo):
  npx -y bandpass demo
  → prints the 33 → 19 selected / 864-token demo, exit 0
```

After verifying, update README quickstart from `npx github:MajidAsghariTabrizi/bandpass demo`
to `npx bandpass demo` (keep the github: form as fallback), and flip the
"publish to npm" roadmap item to done.

## 2. Glama listing (unblocks punkpeye/awesome-mcp-servers PR #16170 — 96k★)

The list's glama-check bot requires the server listed on Glama and a score
badge in the PR. The repo now carries a ready `Dockerfile` (stdio MCP,
introspection-compatible; NOT build-tested locally — no Docker on this machine).

```text
STEPS:
  1. Sign in at https://glama.ai/mcp/servers (GitHub OAuth)
  2. Submit server: GitHub URL https://github.com/MajidAsghariTabrizi/bandpass
  3. Paste the Dockerfile from the repo root into Glama's Dockerfile field
     (their harness builds it; the server only needs to start and answer
     MCP introspection — ours does exactly that via stdio)
  4. Wait for checks to pass, then update PR #16170 by inserting after the
     entry description:
     [![MajidAsghariTabrizi/bandpass MCP server](https://glama.ai/mcp/servers/MajidAsghariTabrizi/bandpass/badges/score.svg)](https://glama.ai/mcp/servers/MajidAsghariTabrizi/bandpass)
  5. Reply "Glama listing + badge added" on the bot thread

EXPECTED RESULT:
  PR #16170 becomes mergeable; on merge, bandpass appears on the default
  MCP directory (and glama.ai syncs it further).
```

## Already done this sprint (machine-executable)

- npm package prep: files whitelist excludes tests/maps; clean-room tarball smoke PASSED
- Dockerfile committed (stdio MCP, node:22-slim)
- 4 upstream PRs checked: only #16170 has an action item (above); other 3 clean and waiting — do NOT bump them
- Outreach queue: 10 individually-written messages (docs/launch/outreach-queue.md)
- openclaw issue comment: BLOCKED (thread locked) → rerouted to owner email
- Launch story + Show HN final + Reddit placement decision: docs/launch/launch-story.md
