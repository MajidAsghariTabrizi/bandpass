# Providers

A provider is anything that can produce raw **Items**. The contract is
deliberately tiny:

```ts
interface Provider {
  id: string;
  available(): boolean | Promise<boolean>;   // cheap environment check
  collect(): Promise<Item[]> | Item[];       // yield raw items
}
```

Providers **degrade, never crash**: an unavailable provider reports
`available: false` in `context_sources` and contributes zero items.

Every item carries the fields the pipeline needs to make decisions:
`subject`, `content`, `kind`, `authority` (channel trust 0..1),
`evidence` (backing source count), `observed_at` (loses conflicts when older),
optional `supersedes`.

## Built-in providers

### static

JSON item files — `{ "items": [ ... ] }` or a bare array. This is also the
fixture/demo format. Defaults: `authority 0.6, evidence 1, kind "fact"`
(overridable per item).

```bash
bandpass compile --task "ship hotfix" --source static:./items.json
```

### filesystem

Deterministic walk of a directory (max depth 4, sorted, skips dotdirs and
`node_modules`, caps at 60 files). One item per recognized file:
subject = relative path, content = 280-char snippet, `observed_at` = mtime.
Authority by file type: `.json` 0.8, `.yaml/.yml` 0.75, `.md` 0.55, `.txt` 0.45.

```bash
bandpass compile --task "ship hotfix" --source fs:./docs
```

### git

Live repository state — branch, HEAD, worktree dirt. High authority (0.9+),
always current, exactly the "current state" agents usually guess.
Fails soft outside a repository.

```bash
bandpass compile --task "ship hotfix" --source git
```

### env

Any `BANDPASS_ITEM_<SUBJECT>` variable becomes a state item
(`__` → `.`, `_` → `-`). The cheapest control surface for CI/containers.

```bash
BANDPASS_ITEM_DEPLOY__REGION=eu-west-1 bandpass compile --task "deploy" --source static:items.json
```

### mission

A mission checkpoint JSON — durable state for long-running agents:

```json
{ "objective": "ship billing v2.2 runbook", "step": 4, "total_steps": 7, "next_action": "draft rollback section" }
```

Mission items are always in-band (relevance 1.0) and render in the MISSION
section of the capsule.

### credence

Consumes an **evidence-first claim export** — JSONL, one claim per line:

```jsonc
{
  "id": "claim:deploy.method",
  "subject": "deploy.method",               // optional; defaults to id
  "text": "deployment method = GitHub Actions",
  "state": "ACTIVE",                        // ACTIVE | STALE | SUPERSEDED | REJECTED
  "support": "VERIFIED",                    // VERIFIED | CORROBORATED | OBSERVED | PRIOR | INFERRED | UNKNOWN | HEARSAY
  "evidence_count": 3,
  "last_verified_at": "2026-09-30T08:00:00Z",
  "supersedes": "claim:deploy.method.jenkins"   // optional
}
```

Mapping: `support` → `authority` (VERIFIED 0.95 … HEARSAY 0.2),
`UNKNOWN` support → `kind: "unknown"` (stays an explicit gap),
`REJECTED` state → skipped, `supersedes` → explicit supersession chain.

This is the public interface to [credence](https://github.com/MajidAsghariTabrizi/credence),
the evidence-first agent memory: serialize its claim ledger to this shape and
bandpass will rank, resolve and budget those claims like any other input —
evidence-aware memory is one input, not the boss. Anything that can emit this
shape works; see [`examples/credence-export.example.jsonl`](../examples/credence-export.example.jsonl).

## Writing your own

```ts
import type { Provider } from 'bandpass';

export class LinearProvider implements Provider {
  id = 'linear';
  async available() { return !!process.env.LINEAR_API_KEY; }
  async collect() {
    // fetch and map to items — provider stays dumb, pipeline stays smart
    return issues.map((i) => ({
      id: `linear:${i.id}`,
      subject: `ticket.${i.team}.${i.slug}`,
      content: `${i.title}: ${i.description?.slice(0, 200)}`,
      kind: 'fact',
      provider: this.id,
      source: `linear://${i.id}`,
      observed_at: i.updatedAt,
      authority: 0.7,
      evidence: 1,
    }));
  }
}
```

Then feed items straight to `compile()` — providers and the compiler compose
freely. Open a PR with a new provider; see
[CONTRIBUTING](../CONTRIBUTING.md).
