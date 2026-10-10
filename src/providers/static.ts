/**
 * Static provider — items from a JSON file.
 * The file format is { "items": [ ... ] } or a bare array of items.
 * This is also the shape of bandpass fixtures and the demo corpus.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { Item } from '../types.js';
import type { Provider } from './index.js';

type StaticItem = Partial<Item> & { id: string; subject: string; content: string };

interface StaticFile {
  items?: StaticItem[];
}

export class StaticProvider implements Provider {
  readonly id: string;
  private readonly file: string;

  constructor(file: string) {
    this.file = file;
    this.id = `static:${path.basename(file).replace(/\.[^.]+$/, '')}`;
  }

  available(): boolean {
    return fs.existsSync(this.file);
  }

  collect(): Item[] {
    const raw = JSON.parse(fs.readFileSync(this.file, 'utf8')) as StaticFile | StaticItem[];
    const items = Array.isArray(raw) ? raw : (raw.items ?? []);
    return items.map((item) => ({
      authority: 0.6,
      evidence: 1,
      kind: 'fact',
      provider: this.id,
      source: `${this.id}://${path.basename(this.file)}`,
      ...item,
    }));
  }
}
