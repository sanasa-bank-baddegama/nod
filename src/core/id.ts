import * as fs from 'fs';
import * as path from 'path';
import type { NodConfig, TaskType } from './types.ts';
import { NotInProjectError } from '../utils/errors.ts';

const CONFIG_DIR = '.nod';
const CONFIG_FILE = 'config.json';

export function findNodRoot(startDir: string): string {
  let dir = startDir;
  while (true) {
    if (fs.existsSync(path.join(dir, CONFIG_DIR))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new NotInProjectError();
    }
    dir = parent;
  }
}

export function readConfig(root: string): NodConfig {
  const configPath = path.join(root, CONFIG_DIR, CONFIG_FILE);
  if (!fs.existsSync(configPath)) {
    throw new NotInProjectError();
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8')) as NodConfig;
}

export function writeConfig(root: string, config: NodConfig): void {
  const configPath = path.join(root, CONFIG_DIR, CONFIG_FILE);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

export function nextCounter(root: string): number {
  const config = readConfig(root);
  config.counter += 1;
  writeConfig(root, config);
  return config.counter;
}

export function generateSlug(title: string): string {
  let slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Truncate at word boundary below 50 chars
  if (slug.length > 50) {
    slug = slug.slice(0, 50).replace(/-[^-]*$/, '');
  }

  return slug;
}

export function generateId(type: TaskType, counter: number): string {
  return `${type}-${counter}`;
}

export function generateFilename(type: TaskType, counter: number, title: string): string {
  const slug = generateSlug(title);
  return `${type}-${counter}-${slug}.md`;
}
