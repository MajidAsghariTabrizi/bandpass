/**
 * Env provider — environment variables as context.
 *
 * Any variable named BANDPASS_ITEM_<SUBJECT>="content" becomes a state item.
 * Useful for CI, containers and MCP configs where the environment is the
 * cheapest control surface.
 */

import type { Item } from '../types.js';
import type { Provider } from './index.js';

export class EnvProvider implements Provider {
  readonly id = 'env';
  private readonly prefix: string;

  constructor(prefix = 'BANDPASS_ITEM_') {
    this.prefix = prefix;
  }

  available(): boolean {
    return true;
  }

  collect(): Item[] {
    const items: Item[] = [];
    for (const [key, value] of Object.entries(process.env)) {
      if (!key.startsWith(this.prefix) || value === undefined) continue;
      const subject = key.slice(this.prefix.length).toLowerCase().replace(/__+/g, '.').replace(/_+/g, '-');
      items.push({
        id: `env:${subject}`,
        subject,
        content: value,
        kind: 'state',
        provider: this.id,
        source: `env://${key}`,
        authority: 0.7,
        evidence: 1,
      });
    }
    items.sort((a, b) => (a.id < b.id ? -1 : 1));
    return items;
  }
}
