import { describe, it, expect } from 'bun:test';
import type { Task } from '../../core/types.ts';
import { parseFullFile, parseFile, serializeTask, buildInitialBody } from '../../utils/format.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTask(overrides?: Partial<Task>): Task {
  return {
    id: 'task-2',
    title: 'Setup Database',
    type: 'task',
    status: 'todo',
    priority: 'high',
    parent: 'epic-1',
    related: ['task-3'],
    tags: ['database', 'backend'],
    created: '2026-04-05',
    updated: '2026-04-05',
    body: '\n# Setup Database\n\n## Notes\n\nSome notes here.\n\n## Work Log\n\n- 2026-04-05: Started\n',
    filePath: '/tasks/task-2-setup-database.md',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Round-trip
// ---------------------------------------------------------------------------

describe('round-trip: serializeTask → parseFullFile', () => {
  it('preserves all required frontmatter fields', () => {
    const task = makeTask();
    const raw = serializeTask(task);
    const result = parseFullFile(raw, task.filePath);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(task.id);
    expect(result!.title).toBe(task.title);
    expect(result!.type).toBe(task.type);
    expect(result!.status).toBe(task.status);
    expect(result!.priority).toBe(task.priority);
    expect(result!.created).toBe(task.created);
    expect(result!.updated).toBe(task.updated);
  });

  it('preserves optional fields: parent, tags, related', () => {
    const task = makeTask();
    const raw = serializeTask(task);
    const result = parseFullFile(raw, task.filePath);
    expect(result!.parent).toBe('epic-1');
    expect(result!.tags).toEqual(['database', 'backend']);
    expect(result!.related).toEqual(['task-3']);
  });

  it('omits optional fields when undefined/empty', () => {
    const task = makeTask({ parent: undefined, tags: undefined, related: undefined });
    const raw = serializeTask(task);
    expect(raw).not.toContain('parent:');
    expect(raw).not.toContain('tags:');
    expect(raw).not.toContain('related:');
    const result = parseFullFile(raw, task.filePath);
    expect(result!.parent).toBeUndefined();
    expect(result!.tags).toBeUndefined();
    expect(result!.related).toBeUndefined();
  });

  it('preserves the body content unchanged', () => {
    const task = makeTask();
    const raw = serializeTask(task);
    const result = parseFullFile(raw, task.filePath);
    expect(result!.body.trim()).toBe(task.body.trim());
  });

  it('handles body containing --- lines without corrupting frontmatter', () => {
    const task = makeTask({ body: '\n# Title\n\nSome text\n---\nMore text\n' });
    const raw = serializeTask(task);
    const result = parseFullFile(raw, task.filePath);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('task-2');
  });
});

// ---------------------------------------------------------------------------
// parseFile / parseFullFile — invalid input
// ---------------------------------------------------------------------------

describe('parseFile with invalid input', () => {
  it('returns null for empty string', () => {
    expect(parseFile('', '/tasks/x.md')).toBeNull();
  });

  it('returns null when required field is missing', () => {
    const raw = `---\nid: task-1\ntitle: "No type"\nstatus: todo\npriority: medium\ncreated: 2026-01-01\nupdated: 2026-01-01\n---\n`;
    expect(parseFile(raw, '/tasks/x.md')).toBeNull();
  });

  it('returns null for invalid enum value in status', () => {
    const raw = `---\nid: task-1\ntitle: "Bad"\ntype: task\nstatus: wip\npriority: medium\ncreated: 2026-01-01\nupdated: 2026-01-01\n---\n`;
    expect(parseFile(raw, '/tasks/x.md')).toBeNull();
  });

  it('returns null for invalid enum value in priority', () => {
    const raw = `---\nid: task-1\ntitle: "Bad"\ntype: task\nstatus: todo\npriority: urgent\ncreated: 2026-01-01\nupdated: 2026-01-01\n---\n`;
    expect(parseFile(raw, '/tasks/x.md')).toBeNull();
  });

  it('returns null when tags is not an array', () => {
    const raw = `---\nid: task-1\ntitle: "Bad"\ntype: task\nstatus: todo\npriority: medium\ncreated: 2026-01-01\nupdated: 2026-01-01\ntags: "not-an-array"\n---\n`;
    expect(parseFile(raw, '/tasks/x.md')).toBeNull();
  });

  it('returns null when related is not an array', () => {
    const raw = `---\nid: task-1\ntitle: "Bad"\ntype: task\nstatus: todo\npriority: medium\ncreated: 2026-01-01\nupdated: 2026-01-01\nrelated: task-2\n---\n`;
    expect(parseFile(raw, '/tasks/x.md')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildInitialBody
// ---------------------------------------------------------------------------

describe('buildInitialBody', () => {
  it('contains the title as an h1', () => {
    expect(buildInitialBody('My Task')).toContain('# My Task');
  });

  it('contains Notes and Work Log sections', () => {
    const body = buildInitialBody('X');
    expect(body).toContain('## Notes');
    expect(body).toContain('## Work Log');
  });
});
