/**
 * Locates the package root (the directory holding package.json) so bundled
 * fixtures can be found whether bandpass runs from a checkout or an install.
 */

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

export function packageRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i += 1) {
    const candidate = path.join(dir, 'package.json');
    if (fs.existsSync(candidate)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(candidate, 'utf8')) as { name?: string };
        if (pkg.name === 'bandpass') return dir;
      } catch {
        // not a readable package.json — keep walking
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback: assume standard layout (dist/ adjacent to package root).
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function fixturePath(name: string): string {
  return path.join(packageRoot(), 'fixtures', name);
}
