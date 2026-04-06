import { describe, it, expect } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { TaskFrontmatter } from '../../core/types.ts';
import {
  createTask,
  loadTask,
  loadAllSummaries,
  findById,
  writeTask,
} from '../../core/store.ts';
import { NotFoundError } from '../../utils/errors.ts';

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

// ---------------------------------------------------------------------------
// createTask
// ---------------------------------------------------------------------------

describe('createTask', () => {
  it('creates a file with the correct filename', async () => {
    await withTempProject(async (root) => {
      const fm = makeFrontmatter();
      const filename = 'task-1-test-task.md';
      createTask(root, fm, filename);

      const filePath = path.join(root, 'tasks', filename);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  it('returns a Task with the correct id and title', async () => {
    await withTempProject(async (root) => {
      const fm = makeFrontmatter({ id: 'epic-5', title: 'Big Epic', type: 'epic' });
      const task = createTask(root, fm, 'epic-5-big-epic.md');
      expect(task.id).toBe('epic-5');
      expect(task.title).toBe('Big Epic');
    });
  });
});

// ---------------------------------------------------------------------------
// loadTask
// ---------------------------------------------------------------------------

describe('loadTask', () => {
  it('round-trip: create then load, frontmatter matches', async () => {
    await withTempProject(async (root) => {
      const fm = makeFrontmatter({ id: 'task-42', title: 'Round-trip Task', priority: 'high' });
      const created = createTask(root, fm, 'task-42-round-trip-task.md');
      const loaded = loadTask(created.filePath);

      expect(loaded.id).toBe(fm.id);
      expect(loaded.title).toBe(fm.title);
      expect(loaded.type).toBe(fm.type);
      expect(loaded.status).toBe(fm.status);
      expect(loaded.priority).toBe(fm.priority);
    });
  });
});

// ---------------------------------------------------------------------------
// loadAllSummaries
// ---------------------------------------------------------------------------

describe('loadAllSummaries', () => {
  it('returns all tasks in the directory', async () => {
    await withTempProject(async (root) => {
      createTask(root, makeFrontmatter({ id: 'task-1', title: 'First' }), 'task-1-first.md');
      createTask(root, makeFrontmatter({ id: 'task-2', title: 'Second' }), 'task-2-second.md');

      const summaries = loadAllSummaries(root);
      expect(summaries).toHaveLength(2);
      const ids = summaries.map(s => s.id).sort();
      expect(ids).toEqual(['task-1', 'task-2']);
    });
  });

  it('skips and does not crash on invalid files', async () => {
    await withTempProject(async (root) => {
      // Write a valid task
      createTask(root, makeFrontmatter({ id: 'task-1', title: 'Valid' }), 'task-1-valid.md');
      // Write an invalid markdown file (no frontmatter)
      fs.writeFileSync(path.join(root, 'tasks', 'garbage.md'), 'not frontmatter\njust text\n');

      const summaries = loadAllSummaries(root);
      // Only the valid one
      expect(summaries).toHaveLength(1);
      expect(summaries[0].id).toBe('task-1');
    });
  });

  it('returns empty array when tasks directory is empty', async () => {
    await withTempProject(async (root) => {
      expect(loadAllSummaries(root)).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// findById
// ---------------------------------------------------------------------------

describe('findById', () => {
  it('finds a task by id', async () => {
    await withTempProject(async (root) => {
      createTask(root, makeFrontmatter({ id: 'task-7', title: 'Find Me' }), 'task-7-find-me.md');
      const summary = findById(root, 'task-7');
      expect(summary.id).toBe('task-7');
    });
  });

  it('throws NotFoundError for a missing id', async () => {
    await withTempProject(async (root) => {
      expect(() => findById(root, 'task-999')).toThrow(NotFoundError);
    });
  });
});

// ---------------------------------------------------------------------------
// writeTask
// ---------------------------------------------------------------------------

describe('writeTask', () => {
  it("updates the 'updated' field to today", async () => {
    await withTempProject(async (root) => {
      const fm = makeFrontmatter({ id: 'task-1', updated: '2020-01-01' });
      const created = createTask(root, fm, 'task-1-test-task.md');

      writeTask({ ...created, updated: '2020-01-01' });

      const reloaded = loadTask(created.filePath);
      const today = new Date().toISOString().slice(0, 10);
      expect(reloaded.updated).toBe(today);
    });
  });

  it('persists changes to other fields', async () => {
    await withTempProject(async (root) => {
      const fm = makeFrontmatter({ id: 'task-1' });
      const created = createTask(root, fm, 'task-1-test-task.md');

      writeTask({ ...created, status: 'in-progress', priority: 'high' });

      const reloaded = loadTask(created.filePath);
      expect(reloaded.status).toBe('in-progress');
      expect(reloaded.priority).toBe('high');
    });
  });
});
