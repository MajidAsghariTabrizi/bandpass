/**
 * Mission provider — durable mission state as context.
 *
 * Long-running agents need their mission checkpoint in every capsule: the
 * objective, the current phase, step N of M, the next action. Feed it a
 * mission JSON emitted by your own runtime (any shape close to the example
 * works; see examples/mission.example.json).
 */

import fs from 'node:fs';
import type { Item } from '../types.js';
import type { Provider } from './index.js';

export interface MissionCheckpoint {
  objective?: string;
  phase?: string;
  step?: number;
  total_steps?: number;
  next_action?: string;
}

export class MissionProvider implements Provider {
  readonly id = 'mission';
  private readonly file: string;

  constructor(file: string) {
    this.file = file;
  }

  available(): boolean {
    return fs.existsSync(this.file);
  }

  collect(): Item[] {
    const mission = JSON.parse(fs.readFileSync(this.file, 'utf8')) as MissionCheckpoint;
    const parts: string[] = [];
    if (mission.step !== undefined && mission.total_steps !== undefined) {
      parts.push(`step ${mission.step} / ${mission.total_steps}`);
    }
    if (mission.objective) parts.push(`objective: ${mission.objective}`);
    if (mission.phase) parts.push(`phase: ${mission.phase}`);
    if (mission.next_action) parts.push(`next: ${mission.next_action}`);
    if (parts.length === 0) return [];
    return [
      {
        id: 'mission:checkpoint',
        subject: 'mission.checkpoint',
        content: parts.join(' — '),
        kind: 'mission',
        provider: this.id,
        source: `mission://${this.file}`,
        authority: 0.95,
        evidence: 1,
      },
    ];
  }
}
