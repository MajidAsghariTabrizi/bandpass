/**
 * Filesystem provider — a deterministic walk over a directory tree.
 *
 * Every recognized file becomes one item: subject = relative path,
 * content = a short snippet. Config-shaped files (json/yaml) get higher
 * authority than prose (md/txt). mtime is the observation time, so stale
 * files lose conflicts against fresh ones.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { Item } from '../types.js';
import type { Provider } from './index.js';

const AUTHORITY_BY_EXT: Record<string, number> = {
  '.json': 0.8,
  '.yaml': 0.75,
  '.yml': 0.75,
  '.md': 0.55,
  '.txt': 0.45,
};

const SNIPPET_CHARS = 280;

export interface FileSystemOptions {
  maxItems?: number;
  snippetChars?: number;
}

export class FileSystemProvider implements Provider {
  readonly id = 'fs';
  private readonly root: string;
  private readonly maxItems: number;

  constructor(root: string, options: FileSystemOptions = {}) {
    this.root = root;
    this.maxItems = options.maxItems ?? 60;
  }

  available(): boolean {
    return fs.existsSync(this.root) && fs.statSync(this.root).isDirectory();
  }

  collect(): Item[] {
    const files = this.walk(this.root).sort();
    const items: Item[] = [];
    for (const abs of files.slice(0, this.maxItems)) {
      const rel = path.relative(this.root, abs).split(path.sep).join('/');
      const ext = path.extname(abs).toLowerCase();
      const authority = AUTHORITY_BY_EXT[ext];
      if (authority === undefined) continue;
      const stat = fs.statSync(abs);
      const raw = fs.readFileSync(abs, 'utf8');
      const snippet = raw.slice(0, SNIPPET_CHARS).replace(/\s+/g, ' ').trim();
      items.push({
        id: `fs:${rel}`,
        subject: `file.${rel.replace(/[\/.]+/g, '.').replace(/^\.+|\.+$/g, '')}`,
        content: `${rel}: ${snippet}${raw.length > SNIPPET_CHARS ? '… (snippet)' : ''}`,
        kind: 'fact',
        provider: this.id,
        source: `file://${rel}`,
        observed_at: stat.mtime.toISOString(),
        authority,
        evidence: 1,
      });
    }
    return items;
  }

  private walk(dir: string, depth = 0): string[] {
    if (depth > 4) return [];
    const out: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...this.walk(abs, depth + 1));
      else out.push(abs);
    }
    return out;
  }
}
