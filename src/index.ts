/**
 * bandpass — the context compiler for AI agents.
 *
 * Give the model less context. Give it better grounds.
 */

export type {
  Capsule,
  CapsuleStats,
  CompileOptions,
  DiffLine,
  ExclusionRecord,
  ExplainTrace,
  Item,
  ItemKind,
  SelectedItem,
  SupersededRecord,
  Support,
} from './types.js';

export { compile, compileDetailed, type CompileDetail } from './compile.js';
export { rankAll, rankItem, tokenize } from './rank.js';
export { gradeSupport } from './verify.js';
export { resolve } from './resolve.js';
export { buildCapsule, renderCapsule, renderExclusions, renderStats } from './capsule.js';
export { explain, renderTrace } from './explain.js';
export { diff, diffCapsules, renderDiff } from './diff.js';
export { estimateTokens } from './tokens.js';
export { runDemo, loadDemoFixture } from './demo.js';

export {
  buildProviders,
  collectAll,
  type Provider,
  type ProviderStatus,
  type SourceSpec,
} from './providers/index.js';

export const VERSION = '0.1.0';
