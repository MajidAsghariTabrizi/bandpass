// Quickstart: compile a capsule from your own items in ~20 lines.
// Run from a checkout:  node examples/quickstart.mjs

import { compile, renderCapsule, renderExclusions } from '../dist/index.js';

const items = [
  {
    id: 'deploy.method.current',
    subject: 'deploy.method',
    content: 'deployment method = GitHub Actions',
    kind: 'fact',
    provider: 'example',
    source: 'config://ci.yml#deploy',
    observed_at: '2026-09-30T08:00:00Z',
    authority: 0.9,
    evidence: 2,
    supersedes: 'deploy.method.old',
  },
  {
    id: 'deploy.method.old',
    subject: 'deploy.method',
    content: 'deployment method = Jenkins',
    kind: 'fact',
    provider: 'example',
    source: 'notes://runbook-2026-06.md#method',
    observed_at: '2026-06-12T10:00:00Z',
    authority: 0.7,
    evidence: 1,
  },
  {
    id: 'unknown.migration-owner',
    subject: 'billing.migration-owner',
    content: 'who owns billing migrations = not established',
    kind: 'unknown',
    provider: 'example',
    source: 'mission://open-questions',
    authority: 0.3,
    evidence: 0,
  },
  {
    id: 'noise.marketing',
    subject: 'marketing.site',
    content: 'new hero color approved',
    kind: 'fact',
    provider: 'example',
    source: 'notes://marketing.md',
    authority: 0.5,
    evidence: 1,
  },
];

const capsule = compile(items, {
  task: 'deploy billing service',
  budget: 500,
  now: '2026-10-05T00:00:00Z',
});

console.log(renderCapsule(capsule));
console.log();
console.log(renderExclusions(capsule));
