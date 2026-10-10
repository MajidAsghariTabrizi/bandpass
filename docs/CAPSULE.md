# The Context Capsule — format `bandpass.capsule/v1`

> A Context Capsule is a compact, inspectable, provenance-aware packet
> containing only the information an agent should receive for the current
> task — plus an explicit record of what was rejected and why.

## JSON shape

```jsonc
{
  "schema": "bandpass.capsule/v1",
  "task": "deploy billing service to production",
  "agent": "demo",                       // optional stamp
  "budget_tokens": 1200,
  "used_tokens": 864,                    // estimate of the agent-facing render

  "known": [                             // asserted facts, strong support
    {
      "id": "deploy.method.gha",
      "subject": "deploy.method",
      "content": "deployment method = GitHub Actions",
      "kind": "fact",
      "support": "VERIFIED",             // VERIFIED | CORROBORATED | OBSERVED | INFERRED | HEARSAY
      "relevance": 0.24,                 // measured task relevance
      "authority": 0.9,                  // source-channel trust, 0..1
      "evidence": 2,                     // independent backing sources
      "provider": "static:deploy-billing",
      "source": "config://deploy-billing/ci.yml#deploy-job",
      "observed_at": "2026-09-30T08:00:00Z",
      "supersedes_summary": "deployment method = Jenkins"
    }
  ],
  "uncertain": [ /* same shape; weak support or hearsay, `note` explains */ ],
  "unknown":   [ /* explicit gaps: kind "unknown", no support claims */ ],
  "superseded": [
    {
      "id": "deploy.method.jenkins",
      "subject": "deploy.method",
      "content": "deployment method = Jenkins",
      "winner_id": "deploy.method.gha",
      "winner_content": "deployment method = GitHub Actions",
      "reason": "explicit-supersession", // | recency | authority | conflict-resolution
      "observed_at": "2026-06-12T10:00:00Z"
    }
  ],
  "excluded": [
    {
      "id": "marketing.site-color",
      "subject": "marketing.site-color",
      "content": "marketing site: new hero color #334455 approved",
      "stage": "RANK",                   // RANK | VERIFY | RESOLVE | BUDGET
      "reason": "relevance below threshold",
      "detail": "relevance 0.00 < 0.15 for task \"deploy billing service to production\""
    }
  ],
  "stats": {
    "collected": 33, "relevant": 21, "verified": 13, "conflicts": 1,
    "superseded": 1, "duplicates": 1, "selected": 19, "rejected": 14
  }
}
```

## Semantics

- **KNOWN** — facts with strong support (VERIFIED/CORROBORATED) the agent may act on.
- **UNCERTAIN** — on-topic items with weak evidence. Surfaced *labeled*, never
  asserted: hearsay about the exact thing you are doing is information; silent
  confidence is not.
- **UNKNOWN** — explicit gaps (`kind: "unknown"`). The agent inherits the gap
  instead of hallucinating over it. Unknowns never resolve into facts.
- **SUPERSEDED** — conflict losers, kept on the record, out of the agent's
  context, not counted against the token budget.
- **EXCLUDED** — the rejection ledger. Every entry names the pipeline stage and
  the reason. Exclusion is a decision; decisions get receipts.

## Item (provider input)

```jsonc
{
  "id": "deploy.method.gha",       // unique within a compile
  "subject": "deploy.method",      // items with the same subject compete
  "content": "deployment method = GitHub Actions",
  "kind": "fact",                  // fact | state | unknown | mission
  "provider": "static:deploy-billing",
  "source": "config://deploy-billing/ci.yml#deploy-job",
  "observed_at": "2026-09-30T08:00:00Z",  // older loses conflicts
  "authority": 0.9,                // 0..1 trust of the source channel
  "evidence": 2,                   // independent backing sources
  "supersedes": "deploy.method.jenkins"   // optional: id or "subject=value" this replaces
}
```

## Rendered form

The text render is what an agent actually receives (see README). Markers:

| marker | section |
|---|---|
| `✓` | KNOWN |
| `~` | UNCERTAIN |
| `?` | UNKNOWN |
| `×` | SUPERSEDED / REJECTED |
| `▸` | MISSION |

`used_tokens` estimates **only the agent-facing sections** (header, KNOWN,
UNCERTAIN, UNKNOWN, MISSION). The SUPERSEDED register and rejection ledger are
inspection surfaces — they don't consume the agent's budget.

All token counts everywhere are **estimates** (4 chars ≈ 1 token).
