# nod — Architecture & Code Review

**Date:** 2026-04-05
**Reviewer:** super-tech-lead
**Scope:** Full codebase review — core, commands, UI, tests

---

## Summary

The codebase is well-structured for its size. The layering is clean (types → id/store/query → commands → utils), error types are purposeful, and the tests cover the important paths. The issues below are concrete bugs or decisions that will cause real pain as the project grows — not style nits.

---

## Issue 1 — Race condition in `nextCounter` corrupts the counter under concurrent writes (HIGH)

**File:** `src/core/id.ts`, lines 36–41

```ts
export function nextCounter(root: string): number {
  const config = readConfig(root);   // read
  config.counter += 1;
  writeConfig(root, config);         // write
  return config.counter;
}
```

This is a classic read-modify-write without any locking. Two concurrent `nod create` invocations (e.g. from a Makefile, CI, or an AI agent running tasks in parallel) will both read the same counter value, both write the same incremented value, and produce two tasks with identical IDs. Because the ID is embedded in both the YAML frontmatter and the filename, there is no recovery path — one file silently overwrites the other, and `findById` will return whichever file `readdirSync` happens to surface first.

**Why it matters:** The tool is described as being "for Claude Code", where agent parallelism is a realistic scenario.

**Fix:** Use an atomic file rename as a poor-man's lock, or use a lock file (`config.lock`) with `fs.openSync` and the `wx` flag (exclusive create). The simplest safe approach on a local filesystem:

```ts
// Write to a temp file then rename — atomic on POSIX
const tmpPath = configPath + '.tmp';
fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
fs.renameSync(tmpPath, configPath);
```

That addresses the write side. For the read-modify-write atomicity you need a lock file:

```ts
const lockPath = configPath + '.lock';
// O_CREAT | O_EXCL — fails if lock already exists
const fd = fs.openSync(lockPath, 'wx');
try {
  const config = readConfig(root);
  config.counter += 1;
  writeConfig(root, config);
  return config.counter;
} finally {
  fs.closeSync(fd);
  fs.unlinkSync(lockPath);
}
```

---

## Issue 2 — `update --title` uses a fragile ID-parsing heuristic to regenerate the filename (BUG)

**File:** `src/commands/update.ts`, line 68

```ts
const newFilename = generateFilename(task.type, parseInt(id.split('-')[1] ?? '0'), task.title);
```

This assumes the counter is always the second segment of the ID (`task-12` → `12`). It silently produces `0` for any ID that doesn't match this pattern (e.g. a manually created file, or a future ID format change). When `parseInt` returns `NaN`, `generateFilename` produces `task-NaN-new-title.md`, which is a valid filename but a broken ID. The original file is then deleted by `renameTask` while the new file carries a corrupt name.

**Fix:** Store the counter in the frontmatter (add a `counter: number` field to `TaskFrontmatter`), or parse it from the existing `filePath` basename, or pass it as a parameter. The cleanest option is to derive it from the filename that already exists:

```ts
const basename = path.basename(task.filePath);                 // "task-12-old-title.md"
const counterStr = basename.split('-')[1] ?? '0';
const counter = parseInt(counterStr, 10);
```

This is still fragile, but at least it reads from the authoritative source rather than re-parsing the user-supplied ID string. The real fix is to store the counter in frontmatter.

---

## Issue 3 — The UI `/api/update` endpoint accepts arbitrary field names and does no validation on values (SECURITY / CORRECTNESS)

**File:** `src/ui/server.ts`, lines 38–54

```ts
const body = (await req.json()) as { id: string; field: string; value: string };
const { id, field, value } = body;

if (field === 'status') {
  (task as { status: Status }).status = value as Status;
```

Two problems:

**3a — No input validation on `value`.** A POST to `/api/update` with `{ id: "task-1", field: "status", value: "anything-at-all" }` will write an invalid status string into the YAML frontmatter. On the next `loadAllSummaries`, `isValidFrontmatter` will reject that file and it will silently disappear from all queries. There is no recovery path for the user without manual YAML editing.

**3b — The server is localhost-only but has no authentication.** Any process on the same machine can POST to it. This is acceptable for a local dev tool, but the lack of value validation means a malicious or buggy script can corrupt task files.

**Fix:** Validate the value against the allowed sets before writing:

```ts
import { STATUSES, PRIORITIES } from '../core/types.ts';

if (field === 'status') {
  if (!STATUSES.includes(value as Status)) {
    return jsonResponse({ error: `Invalid status: ${value}` }, 400);
  }
  task.status = value as Status;
} else if (field === 'priority') {
  if (!PRIORITIES.includes(value as Priority)) {
    return jsonResponse({ error: `Invalid priority: ${value}` }, 400);
  }
  task.priority = value as Priority;
}
```

---

## Issue 4 — `buildTree` can infinite-loop on a cycle in the parent graph (CORRECTNESS)

**File:** `src/core/query.ts`, lines 39–47

`buildNode` recurses via `getChildren` with no cycle detection. If a task file is manually edited so that `task-2` has `parent: task-3` and `task-3` has `parent: task-2`, calling `nod tree task-2` will blow the call stack.

This is unlikely in normal use but is a real risk when the tasks directory is managed by humans or AI agents writing files directly.

**Fix:** Pass a `seen: Set<string>` through the recursion:

```ts
function buildNode(tasks: TaskSummary[], task: TaskSummary, seen = new Set<string>()): TreeNode {
  if (seen.has(task.id)) return { task, children: [] }; // break cycle
  seen.add(task.id);
  const children = getChildren(tasks, task.id)
    .map((child) => buildNode(tasks, child, new Set(seen)));
  return { task, children };
}
```

---

## Issue 5 — `loadAllSummaries` does a full disk read on every command invocation (PERFORMANCE / ARCHITECTURE)

**Files:** `src/core/store.ts` line 13; called in `create.ts`, `update.ts`, `list.ts`, `available.ts`, `subtasks.ts`, `epic-tasks.ts`, `tree.ts`

Every command reads every `.md` file in `tasks/` synchronously. At small scale this is fine, but because `create.ts` calls `loadAllSummaries` just to validate a parent ID (line 27), and then also calls `nextCounter` which does another `readConfig`/`writeConfig` round-trip, a project with a few hundred tasks will noticeably lag on every create.

More importantly, `findById` on line 43 of `store.ts` does a full scan:

```ts
export function findById(root: string, id: string): TaskSummary {
  const summaries = loadAllSummaries(root);
  const found = summaries.find((t) => t.id === id);
```

And commands like `update.ts` call `findById` then `loadAllSummaries` again independently, doing two full directory scans.

**This is an architectural decision that's cheap to change now but expensive later.** The right fix is a lightweight in-memory index maintained across the request — or simpler, derive the file path directly from the ID since IDs encode the filename prefix (`task-12` → look for `task-12-*.md`):

```ts
export function findById(root: string, id: string): TaskSummary {
  const dir = tasksDir(root);
  const files = fs.readdirSync(dir).filter(f => f.startsWith(id + '-') && f.endsWith('.md'));
  if (files.length === 0) throw new NotFoundError(id);
  // Handle the unlikely case of multiple matches
  const filePath = path.join(dir, files[0]!);
  const raw = fs.readFileSync(filePath, 'utf8');
  const summary = parseFile(raw, filePath);
  if (!summary) throw new NotFoundError(id);
  return summary;
}
```

This makes `findById` O(1) directory listing instead of O(n) full reads.

---

## Issue 6 — `isValidFrontmatter` silently accepts structurally wrong optional fields

**File:** `src/utils/format.ts`, lines 65–77

The validator checks that `id`, `title`, `type`, `status`, `priority`, `created`, `updated` are present and of the right type. But `parent`, `related`, and `tags` are not validated at all. A file with `parent: 42` or `tags: "not-an-array"` passes validation, gets typed as `TaskFrontmatter`, and the rest of the code does `task.tags.map(...)` etc. without protection.

**Fix:** Add optional field validation:

```ts
if ('parent' in d && d['parent'] !== undefined && typeof d['parent'] !== 'string') return false;
if ('tags' in d && d['tags'] !== undefined && !Array.isArray(d['tags'])) return false;
if ('related' in d && d['related'] !== undefined && !Array.isArray(d['related'])) return false;
```

---

## Issue 7 — Status button label in the UI shows the *current* status, not the *next* status (UX BUG)

**File:** `src/ui/app.html`, lines 332–334

```js
const nextStatus = STATUS_CYCLE[task.status] ?? 'todo';
const nextLabel  = STATUS_LABELS[task.status] ?? task.status;  // <-- uses current status key
```

`nextLabel` is keyed on `task.status` (current), not `nextStatus`. The button label therefore always shows the current status name. For a `todo` task, the button says "Todo" when it should say "In Progress" to communicate what clicking will do.

**Fix:** One character change:

```js
const nextLabel = STATUS_LABELS[nextStatus] ?? nextStatus;
```

---

## Quick Wins (low effort, real value)

**QW-1 — `update --parent ""` clears the parent** (`update.ts` line 42) via `opts.parent || undefined`, which is correct. But there is no corresponding `--unset-parent` flag and the empty-string path is undocumented. Add `--unset-parent` as a boolean flag for discoverability.

**QW-2 — `open.ts` falls back to `vim` silently.** If a user on a machine without vim runs `nod open`, they get a confusing error. Fall back to `nano`, or print a clear message if neither `EDITOR` nor `VISUAL` is set and the binary is not found.

**QW-3 — `note.ts` inserts the entry before trailing content of a section but doesn't handle CRLF line endings.** The `\n##` regex on line 26 will miss Windows-style `\r\n##` separators. This will only manifest when tasks are created on Windows or synced from a Windows machine. Normalize line endings on read: `raw.replace(/\r\n/g, '\n')`.

**QW-4 — `format.ts` imports `Status` and `TaskTypeAlias` at the bottom of the file** (line 80) after they've already been used in `isValidFrontmatter`. This works at runtime but is confusing and will confuse tree-shakers. Move all imports to the top.

**QW-5 — `ui.ts` uses `Bun.spawn(['open', url])` which is macOS-only.** On Linux, the equivalent is `xdg-open`. Add a platform check or use a small utility:

```ts
const opener = process.platform === 'darwin' ? 'open'
             : process.platform === 'win32'  ? 'start'
             : 'xdg-open';
Bun.spawn([opener, url], { stdio: ['ignore', 'ignore', 'ignore'] });
```

---

## Architecture Decisions That Are Fine As-Is

- **One file per task** is the right call for a tool that wants tasks to be git-diffable and editor-editable. Resist any pressure to consolidate into a SQLite store — you lose the human-readable benefit that justifies gray-matter's existence.
- **No caching layer** is correct at this scale. Don't add one until `loadAllSummaries` measurably hurts (the `findById` O(1) fix in Issue 5 buys significant headroom first).
- **Commander over a custom arg parser** is the right boring choice.
- **The test structure** (pure unit tests for query/id, integration tests with a temp dir for store) is the correct split. The coverage of the core layer is solid.

---

## Priority Order

| # | Issue | Severity |
|---|-------|----------|
| 1 | Race condition in `nextCounter` | High — data loss |
| 2 | `update --title` NaN filename bug | High — data loss |
| 3 | UI endpoint accepts invalid enum values | Medium — data corruption |
| 7 | Status button label shows wrong text | Medium — UX bug (users see misleading button labels) |
| 4 | Cycle detection in `buildTree` | Low — crash only on corrupt data |
| 6 | Optional frontmatter field validation | Low — type safety |
| 5 | `findById` full scan | Low now, Medium at scale |
| QWs | Quick wins | Low |
