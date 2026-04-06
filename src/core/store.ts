import * as fs from 'fs';
import * as path from 'path';
import { parseFile, parseFullFile, serializeTask, buildInitialBody } from '../utils/format.ts';
import type { Task, TaskFrontmatter, TaskSummary } from './types.ts';
import { NotFoundError } from '../utils/errors.ts';

const TASKS_DIR = '.nod/tasks';

export function tasksDir(root: string): string {
  return path.join(root, TASKS_DIR);
}

export function loadAllSummaries(root: string): TaskSummary[] {
  const dir = tasksDir(root);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  const summaries: TaskSummary[] = [];

  for (const file of files) {
    const filePath = path.join(dir, file);
    const raw = fs.readFileSync(filePath, 'utf8');
    const summary = parseFile(raw, filePath);
    if (summary) {
      summaries.push(summary);
    } else {
      console.warn(`Warning: skipping invalid task file: ${file}`);
    }
  }

  return summaries;
}

export function loadTask(filePath: string): Task {
  const raw = fs.readFileSync(filePath, 'utf8');
  const task = parseFullFile(raw, filePath);
  if (!task) {
    throw new Error(`Failed to parse task file: ${filePath}`);
  }
  return task;
}

export function findById(root: string, id: string): TaskSummary {
  const summaries = loadAllSummaries(root);
  const found = summaries.find((t) => t.id === id);
  if (!found) throw new NotFoundError(id);
  return found;
}

export function writeTask(task: Task): void {
  const today = new Date().toISOString().slice(0, 10);
  const updated: Task = { ...task, updated: today };
  fs.writeFileSync(updated.filePath, serializeTask(updated), 'utf8');
}

export function createTask(
  root: string,
  frontmatter: TaskFrontmatter,
  filename: string
): Task {
  const dir = tasksDir(root);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filePath = path.join(dir, filename);
  const body = buildInitialBody(frontmatter.title);
  const task: Task = { ...frontmatter, body, filePath };
  fs.writeFileSync(filePath, serializeTask(task), 'utf8');
  return task;
}

export function renameTask(task: Task, newFilename: string): Task {
  const dir = path.dirname(task.filePath);
  const newFilePath = path.join(dir, newFilename);
  const updated: Task = { ...task, filePath: newFilePath };
  fs.writeFileSync(newFilePath, serializeTask(updated), 'utf8');
  fs.unlinkSync(task.filePath);
  return updated;
}
