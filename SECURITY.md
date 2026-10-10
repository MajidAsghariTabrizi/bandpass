# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| 0.1.x | yes |

## Reporting a vulnerability

Use GitHub's private reporting: **Security tab → "Report a vulnerability"**
(or [open one directly](https://github.com/MajidAsghariTabrizi/bandpass/security/advisories/new)).

Please include reproduction steps and impact. We aim to respond within 72 hours
and will credit reporters in the advisory unless you prefer anonymity.

## Scope & design notes

bandpass is a **local, read-only context compiler**:

- The compiler performs **no network I/O** and calls no models.
- The MCP server exposes **read-only tools** over stdio; it writes nothing.
- Providers read files, environment variables and local git state **from the
  paths you explicitly configure** — the filesystem provider walks only the
  directory you pass it (depth 4, 60-file cap).
- Do not point bandpass at directories containing secrets you don't want
  surfaced in a capsule: file contents are excerpted into context by design.
- CI runs [gitleaks](https://github.com/gitleaks/gitleaks) on every push.
