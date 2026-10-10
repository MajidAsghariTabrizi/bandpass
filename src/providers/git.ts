/**
 * Git provider — the repository's live state as context items.
 *
 * Branch, HEAD and worktree dirt are exactly the kind of "current state" an
 * agent needs and usually guesses. High authority, always current, fails
 * soft outside a repository.
 */

import { spawnSync } from 'node:child_process';
import type { Item } from '../types.js';
import type { Provider } from './index.js';

function git(cwd: string, args: string[]): string | null {
  try {
    const res = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 5000 });
    if (res.error || res.status !== 0) return null;
    return res.stdout.trim();
  } catch {
    return null;
  }
}

export class GitProvider implements Provider {
  readonly id = 'git';
  private readonly cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;
  }

  available(): boolean {
    return git(this.cwd, ['rev-parse', '--is-inside-work-tree']) === 'true';
  }

  collect(): Item[] {
    const branch = git(this.cwd, ['branch', '--show-current']);
    const head = git(this.cwd, ['log', '-1', '--format=%h %cI %s']);
    const status = git(this.cwd, ['status', '--porcelain']);
    if (!branch && !head) return [];

    const items: Item[] = [];
    if (branch) {
      items.push({
        id: 'git:branch',
        subject: 'git.branch',
        content: `current git branch = ${branch}`,
        kind: 'state',
        provider: this.id,
        source: `git://${this.cwd}#HEAD`,
        authority: 0.95,
        evidence: 1,
      });
    }
    if (head) {
      items.push({
        id: 'git:head',
        subject: 'git.head',
        content: `HEAD ${head}`,
        kind: 'state',
        provider: this.id,
        source: `git://${this.cwd}#log-1`,
        authority: 0.95,
        evidence: 1,
      });
    }
    if (status !== null) {
      const dirty = status ? status.split('\n').filter(Boolean).length : 0;
      items.push({
        id: 'git:worktree',
        subject: 'git.worktree',
        content: dirty === 0 ? 'git worktree clean' : `git worktree dirty: ${dirty} changed file(s)`,
        kind: 'state',
        provider: this.id,
        source: `git://${this.cwd}#status`,
        authority: 0.9,
        evidence: 1,
      });
    }
    return items;
  }
}
