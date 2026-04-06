import { describe, it, expect } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  generateSlug,
  generateId,
  generateFilename,
  nextCounter,
} from '../../core/id.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function withTempProject(fn: (root: string) => Promise<void>) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nod-test-'));
  try {
    fs.mkdirSync(path.join(root, '.nod'));
    fs.writeFileSync(
      path.join(root, '.nod', 'config.json'),
      JSON.stringify({ counter: 0, version: '1' })
    );
    fs.mkdirSync(path.join(root, 'tasks'));
    await fn(root);
  } finally {
    fs.rmSync(root, { recursive: true });
  }
}

// ---------------------------------------------------------------------------
// generateSlug
// ---------------------------------------------------------------------------

describe('generateSlug', () => {
  it('lowercases and hyphenates a simple title', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  it('trims leading/trailing hyphens and collapses multiple hyphens', () => {
    expect(generateSlug('  --Multiple---Hyphens-- ')).toBe('multiple-hyphens');
  });

  it('truncates long titles at a word boundary under 50 chars', () => {
    const long = 'This is a very long title that definitely exceeds fifty characters in total';
    const result = generateSlug(long);
    // Must be at most 50 chars and must not end mid-word (no trailing hyphen)
    expect(result.length).toBeLessThanOrEqual(50);
    expect(result).not.toMatch(/-$/);
    // Must be a prefix of the full slug up to a word boundary
    const fullSlug = long
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    expect(fullSlug.startsWith(result)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// generateId
// ---------------------------------------------------------------------------

describe('generateId', () => {
  it("returns 'task-2' for type='task', counter=2", () => {
    expect(generateId('task', 2)).toBe('task-2');
  });

  it('works for other task types', () => {
    expect(generateId('epic', 1)).toBe('epic-1');
    expect(generateId('bug', 99)).toBe('bug-99');
    expect(generateId('subtask', 7)).toBe('subtask-7');
  });
});

// ---------------------------------------------------------------------------
// generateFilename
// ---------------------------------------------------------------------------

describe('generateFilename', () => {
  it("returns 'task-2-setup-db.md' for type='task', counter=2, title='Setup DB'", () => {
    expect(generateFilename('task', 2, 'Setup DB')).toBe('task-2-setup-db.md');
  });
});

// ---------------------------------------------------------------------------
// nextCounter (uses real temp dir)
// ---------------------------------------------------------------------------

describe('nextCounter', () => {
  it('starts at 1 and increments correctly across calls', async () => {
    await withTempProject(async (root) => {
      expect(nextCounter(root)).toBe(1);
      expect(nextCounter(root)).toBe(2);
      expect(nextCounter(root)).toBe(3);
    });
  });
});
