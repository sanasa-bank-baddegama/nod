import { describe, it, expect } from 'bun:test';
import type { TaskSummary } from '../../core/types.ts';
import { buildTree, sortByPriority } from '../../core/query.ts';

function makeTask(overrides: Partial<TaskSummary> & { id: string }): TaskSummary {
  return {
    id: overrides.id,
    title: overrides.title ?? `Task ${overrides.id}`,
    type: overrides.type ?? 'task',
    status: overrides.status ?? 'todo',
    priority: overrides.priority ?? 'medium',
    created: overrides.created ?? '2024-01-01',
    updated: overrides.updated ?? '2024-01-01',
    filePath: `/tasks/${overrides.id}.md`,
    parent: overrides.parent,
    tags: overrides.tags,
  };
}

// ---------------------------------------------------------------------------
// buildTree
// ---------------------------------------------------------------------------

describe('buildTree', () => {
  it('returns null for unknown rootId', () => {
    expect(buildTree([], 'epic-99')).toBeNull();
  });

  it('returns a leaf node with no children', () => {
    const tasks = [makeTask({ id: 'epic-1', type: 'epic' })];
    const tree = buildTree(tasks, 'epic-1');
    expect(tree).not.toBeNull();
    expect(tree!.task.id).toBe('epic-1');
    expect(tree!.children).toHaveLength(0);
  });

  it('builds a two-level tree correctly', () => {
    const tasks = [
      makeTask({ id: 'epic-1', type: 'epic' }),
      makeTask({ id: 'task-2', parent: 'epic-1' }),
      makeTask({ id: 'task-3', parent: 'epic-1' }),
    ];
    const tree = buildTree(tasks, 'epic-1');
    expect(tree!.children).toHaveLength(2);
    const childIds = tree!.children.map((c) => c.task.id);
    expect(childIds).toContain('task-2');
    expect(childIds).toContain('task-3');
  });

  it('builds a three-level tree correctly', () => {
    const tasks = [
      makeTask({ id: 'epic-1', type: 'epic' }),
      makeTask({ id: 'task-2', parent: 'epic-1' }),
      makeTask({ id: 'subtask-3', type: 'subtask', parent: 'task-2' }),
    ];
    const tree = buildTree(tasks, 'epic-1');
    expect(tree!.children).toHaveLength(1);
    expect(tree!.children[0]!.children).toHaveLength(1);
    expect(tree!.children[0]!.children[0]!.task.id).toBe('subtask-3');
  });

  it('does not crash or loop on a parent cycle', () => {
    // task-2 → parent task-3 → parent task-2 (cycle)
    const tasks = [
      makeTask({ id: 'task-2', parent: 'task-3' }),
      makeTask({ id: 'task-3', parent: 'task-2' }),
    ];
    // Should not throw or run forever
    expect(() => buildTree(tasks, 'task-2')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// sortByPriority — secondary sort by created date
// ---------------------------------------------------------------------------

describe('sortByPriority — tie-breaking', () => {
  it('breaks ties by created date (older first)', () => {
    const tasks = [
      makeTask({ id: 'task-b', priority: 'high', created: '2024-03-01' }),
      makeTask({ id: 'task-a', priority: 'high', created: '2024-01-01' }),
    ];
    const sorted = sortByPriority(tasks);
    expect(sorted[0]!.id).toBe('task-a');
    expect(sorted[1]!.id).toBe('task-b');
  });
});

// ---------------------------------------------------------------------------
// generateSlug edge cases
// ---------------------------------------------------------------------------

import { generateSlug } from '../../core/id.ts';

describe('generateSlug — edge cases', () => {
  it('returns empty string for a title with only special characters', () => {
    expect(generateSlug('!!!')).toBe('');
  });

  it('returns empty string for an empty title', () => {
    expect(generateSlug('')).toBe('');
  });

  it('handles numeric-only titles', () => {
    expect(generateSlug('123')).toBe('123');
  });
});
