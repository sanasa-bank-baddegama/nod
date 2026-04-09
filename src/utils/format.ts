import matter from 'gray-matter';
import yaml from 'js-yaml';
import type { Status, Task, TaskFrontmatter, TaskSummary, TaskType } from '../core/types.ts';
import { TASK_TYPES, STATUSES, PRIORITIES } from '../core/types.ts';

export function parseFile(raw: string, filePath: string): TaskSummary | null {
  try {
    const { data, content } = matter(raw);
    if (!isValidFrontmatter(data)) {
      return null;
    }
    return {
      ...(data as TaskFrontmatter),
      filePath,
    };
  } catch {
    return null;
  }
}

export function parseFullFile(raw: string, filePath: string): Task | null {
  try {
    const { data, content } = matter(raw);
    if (!isValidFrontmatter(data)) {
      return null;
    }
    return {
      ...(data as TaskFrontmatter),
      body: content,
      filePath,
    };
  } catch {
    return null;
  }
}

export function serializeTask(task: Task): string {
  const frontmatter: TaskFrontmatter = {
    id: task.id,
    title: task.title,
    type: task.type,
    status: task.status,
    priority: task.priority,
    created: task.created,
    updated: task.updated,
  };

  if (task.parent !== undefined) frontmatter.parent = task.parent;
  if (task.related !== undefined && task.related.length > 0) frontmatter.related = task.related;
  if (task.tags !== undefined && task.tags.length > 0) frontmatter.tags = task.tags;

  const yamlStr = yaml.dump(frontmatter, {
    lineWidth: -1,
    quotingType: '"',
    forceQuotes: false,
  });

  return `---\n${yamlStr}---\n${task.body}`;
}

export function buildInitialBody(title: string, body?: string): string {
  const content = body ? body.trimEnd() + '\n' : '';
  return `# ${title}\n\n${content}\n## Notes\n\n\n## Work Log\n\n`;
}

function isValidFrontmatter(data: unknown): data is TaskFrontmatter {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (
    typeof d['id'] !== 'string' ||
    typeof d['title'] !== 'string' ||
    !TASK_TYPES.includes(d['type'] as TaskType) ||
    !STATUSES.includes(d['status'] as Status) ||
    !PRIORITIES.includes(d['priority'] as Priority) ||
    typeof d['created'] !== 'string' ||
    typeof d['updated'] !== 'string'
  ) {
    return false;
  }
  // Validate optional fields when present
  if (d['parent'] !== undefined && typeof d['parent'] !== 'string') return false;
  if (d['tags'] !== undefined && !Array.isArray(d['tags'])) return false;
  if (d['related'] !== undefined && !Array.isArray(d['related'])) return false;
  return true;
}
