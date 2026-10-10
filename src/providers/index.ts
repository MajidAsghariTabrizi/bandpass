/**
 * Providers — the input side of the compiler.
 *
 * A provider is anything that can produce raw Items. The contract is
 * deliberately tiny: report availability, yield items. Memory stores, git
 * state, config trees, environment, mission checkpoints — all just items
 * with authority and timestamps. The compiler does the rest.
 */

import type { Item } from '../types.js';

export interface Provider {
  id: string;
  /** Cheap check: can this provider produce items in this environment? */
  available(): boolean | Promise<boolean>;
  collect(): Promise<Item[]> | Item[];
}

export interface SourceSpec {
  /** Path(s) to JSON item files: { "items": [...] } or a bare array. */
  static?: string[];
  /** Directory to walk for file-backed items. */
  fs?: string;
  /** Treat cwd as a git repository and expose branch/head/worktree state. */
  git?: boolean | string;
  /** Environment variable prefix (default BANDPASS_ITEM_). */
  env?: string;
  /** Path to a mission checkpoint JSON. */
  mission?: string;
  /** Path to a Credence claim export (JSONL). */
  credence?: string;
}

export { StaticProvider } from './static.js';
export { FileSystemProvider } from './filesystem.js';
export { GitProvider } from './git.js';
export { EnvProvider } from './env.js';
export { MissionProvider } from './mission.js';
export { CredenceProvider } from './credence.js';

import { StaticProvider } from './static.js';
import { FileSystemProvider } from './filesystem.js';
import { GitProvider } from './git.js';
import { EnvProvider } from './env.js';
import { MissionProvider } from './mission.js';
import { CredenceProvider } from './credence.js';

export function buildProviders(spec: SourceSpec): Provider[] {
  const providers: Provider[] = [];
  for (const p of spec.static ?? []) providers.push(new StaticProvider(p));
  if (spec.fs) providers.push(new FileSystemProvider(spec.fs));
  if (spec.git) providers.push(new GitProvider(typeof spec.git === 'string' ? spec.git : process.cwd()));
  providers.push(new EnvProvider(spec.env));
  if (spec.mission) providers.push(new MissionProvider(spec.mission));
  if (spec.credence) providers.push(new CredenceProvider(spec.credence));
  return providers;
}

export interface ProviderStatus {
  id: string;
  available: boolean;
  items: number;
  error?: string;
}

/** Collect from every provider; a failing provider degrades, never crashes. */
export async function collectAll(providers: Provider[]): Promise<{ items: Item[]; statuses: ProviderStatus[] }> {
  const items: Item[] = [];
  const statuses: ProviderStatus[] = [];
  for (const provider of providers) {
    try {
      const ok = await provider.available();
      if (!ok) {
        statuses.push({ id: provider.id, available: false, items: 0, error: 'not available in this environment' });
        continue;
      }
      const collected = await provider.collect();
      items.push(...collected);
      statuses.push({ id: provider.id, available: true, items: collected.length });
    } catch (error) {
      statuses.push({
        id: provider.id,
        available: false,
        items: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { items, statuses };
}
