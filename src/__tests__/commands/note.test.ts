import { describe, it, expect } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { TaskFrontmatter } from '../../core/types.ts';
import { createTask, loadTask } from '../../core/store.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function withTempProject(fn: (root: string) => Promise<void>) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nod-note-test-'));
  try {
    fs.mkdirSync(path.join(root, '.nod'));
    fs.writeFileSync(
      path.join(root, '.nod', 'config.json'),
      JSON.stringify({ counter: 0, version: '1' })
    );
    fs.mkdirSync(path.join(root, '.nod', 'tasks'));
    await fn(root);
  } finally {
    fs.rmSync(root, { recursive: true });
  }
}

function makeFrontmatter(overrides?: Partial<TaskFrontmatter>): TaskFrontmatter {
  return {
    id: 'task-1',
    title: 'Test Task',
    type: 'task',
    status: 'todo',
    priority: 'medium',
    created: '2024-01-01',
    updated: '2024-01-01',
    ...overrides,
  };
}

// Mirrors the logic in note.ts so we can test it in isolation
const WORK_LOG_HEADING = '## Work Log';

function appendNote(body: string, text: string, date: string): string {
  const entry = `- ${date}: ${text}`;
  const headingIndex = body.indexOf(WORK_LOG_HEADING);

  if (headingIndex !== -1) {
    const afterHeading = headingIndex + WORK_LOG_HEADING.length;
    const nextSectionMatch = body.slice(afterHeading).match(/\n## /);
    const insertAt = nextSectionMatch
      ? afterHeading + (nextSectionMatch.index ?? 0)
      : body.length;

    const before = body.slice(0, insertAt).trimEnd();
    const after = body.slice(insertAt);
    return `${before}\n${entry}\n${after ? '\n' + after.trimStart() : ''}`;
  } else {
    return body.trimEnd() + `\n\n${WORK_LOG_HEADING}\n\n${entry}\n`;
  }
}

// ---------------------------------------------------------------------------
// Work Log insertion logic
// ---------------------------------------------------------------------------

describe('appendNote — Work Log insertion', () => {
  it('appends entry when Work Log section exists with no following section', () => {
    const body = '\n# Task\n\n## Work Log\n\n';
    const result = appendNote(body, 'Did a thing', '2026-04-05');
    expect(result).toContain('- 2026-04-05: Did a thing');
    expect(result.indexOf('## Work Log')).toBeLessThan(result.indexOf('- 2026-04-05'));
  });

  it('inserts entry before the next ## section', () => {
    const body = '\n# Task\n\n## Work Log\n\n- 2026-04-01: Old note\n\n## Notes\n\nSome notes\n';
    const result = appendNote(body, 'New note', '2026-04-05');
    const workLogIdx = result.indexOf('## Work Log');
    const newNoteIdx = result.indexOf('- 2026-04-05: New note');
    const notesIdx = result.indexOf('## Notes');
    // Entry should be between Work Log heading and Notes section
    expect(workLogIdx).toBeLessThan(newNoteIdx);
    expect(newNoteIdx).toBeLessThan(notesIdx);
  });

  it('creates Work Log section when it does not exist', () => {
    const body = '\n# Task\n\nJust a description.\n';
    const result = appendNote(body, 'Started work', '2026-04-05');
    expect(result).toContain('## Work Log');
    expect(result).toContain('- 2026-04-05: Started work');
    expect(result.indexOf('## Work Log')).toBeLessThan(result.indexOf('- 2026-04-05'));
  });

  it('preserves existing entries when appending', () => {
    const body = '\n# Task\n\n## Work Log\n\n- 2026-04-01: First note\n';
    const result = appendNote(body, 'Second note', '2026-04-05');
    expect(result).toContain('- 2026-04-01: First note');
    expect(result).toContain('- 2026-04-05: Second note');
  });

  it('uses the correct date format', () => {
    const body = '\n# Task\n\n## Work Log\n\n';
    const result = appendNote(body, 'text', '2026-12-31');
    expect(result).toContain('- 2026-12-31: text');
  });
});

// ---------------------------------------------------------------------------
// Integration: note persists to disk
// ---------------------------------------------------------------------------

describe('note command integration', () => {
  it('appended note is readable after round-trip through store', async () => {
    await withTempProject(async (root) => {
      const task = createTask(root, makeFrontmatter(), 'task-1-test-task.md');

      // Simulate what note.ts does
      const loaded = loadTask(task.filePath);
      const today = '2026-04-05';
      const entry = `- ${today}: Integration test note`;
      const newBody = loaded.body.trimEnd() + `\n\n${WORK_LOG_HEADING}\n\n${entry}\n`;

      const { writeTask } = await import('../../core/store.ts');
      writeTask({ ...loaded, body: newBody });

      const reloaded = loadTask(task.filePath);
      expect(reloaded.body).toContain('- 2026-04-05: Integration test note');
    });
  });
});
