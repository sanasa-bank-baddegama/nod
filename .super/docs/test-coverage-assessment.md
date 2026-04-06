# Test Coverage Assessment: nod CLI

**Date:** 2026-04-05
**Test run result:** 37 pass, 0 fail, 56 expect() calls across 3 files

---

## Executive Summary

The existing tests are well-structured and cover the happy path thoroughly for the three core modules. The test quality is good — fixtures are clean, helpers avoid duplication, and mutation checks are present. However, coverage has two serious gaps:

1. **`format.ts` is completely untested** despite being the serialization/deserialization layer that every other test depends on indirectly.
2. **All 12 command files have zero test coverage**, including business logic in `create.ts`, `update.ts`, and `note.ts` that contains real conditional branches and data mutations.

Several edge cases in the covered modules are also missing and represent real failure modes.

---

## Current Test State

| File | Tests | Pass | Gaps |
|------|-------|------|------|
| `src/core/id.ts` | `id.test.ts` | Yes | Missing: empty/special-char slugs, `findNodRoot` traversal, `readConfig`/`writeConfig` |
| `src/core/query.ts` | `query.test.ts` | Yes | Missing: `buildTree`, unknown priority sort, empty inputs |
| `src/core/store.ts` | `store.test.ts` | Yes | Missing: `renameTask`, missing tasks dir, duplicate file handling |
| `src/utils/format.ts` | None | — | Entire file untested |
| `src/utils/errors.ts` | None | — | Trivial but `exitCode` contracts never verified |
| `src/commands/*.ts` | None | — | 12 files, 0 tests |

---

## Findings by File

### `src/__tests__/core/id.test.ts`

**Quality:** Good. The truncation test correctly validates at a word boundary.

**Missing cases:**

**`generateSlug`**
- Empty string input — `generateSlug('')` should return `''` or be handled. The current implementation runs `.replace()` on an empty string and returns `''`, but this is never verified.
- Title that is entirely non-alphanumeric (e.g., `'!!!'`) — produces `''` after strip. A filename of `task-1-.md` would result. This is a real-world bug risk.
- Title that is exactly 50 chars after slugification — boundary value; confirm no truncation fires.
- Title that slugifies to exactly 51 chars — confirm truncation fires and no trailing hyphen.
- Unicode/emoji in title (e.g., `'Fix naïve bug'`) — `[^a-z0-9]+` strips accents, but the behavior is not verified.

**`nextCounter`**
- Concurrent-ish calls (calling `nextCounter` on a root where the config file has been externally modified mid-test) — not practically testable without mocking but worth noting as a data integrity risk.
- Config file missing (no `.nod/config.json`) — should throw `NotInProjectError`. `readConfig` is exercised through `nextCounter` but the error path is not tested.

**`findNodRoot` (exported but has no tests at all)**
- Walking up to a `.nod` directory in a parent — the traversal loop is the riskiest code in `id.ts`.
- Starting in a directory that has no `.nod` ancestor — should throw `NotInProjectError`.
- Starting inside a deeply nested subdirectory of a project — should still find root.
- Running at filesystem root (`/`) — infinite loop guard: the `parent === dir` check is the only protection; this is never exercised.

**`readConfig` / `writeConfig` (exported but have no tests)**
- `readConfig` on a malformed JSON file — `JSON.parse` throws; not caught; crash propagates to the command level with no useful error.
- `writeConfig` round-trips the config correctly (written then re-read equals original).

---

### `src/__tests__/core/query.test.ts`

**Quality:** Solid. The fixture is realistic and the tag AND-logic test is valuable.

**Missing cases:**

**`filterTasks`**
- Empty `tasks` array input — should return `[]` without crashing.
- Empty `opts` object `{}` — all tasks should be returned (no filters applied).
- `opts.parent = undefined` vs `opts.parent` key absent — the implementation checks `opts.parent !== undefined`, meaning an explicit `{ parent: undefined }` is treated the same as a missing key. This subtle distinction is never tested and could silently match orphan tasks.
- `tags: []` (empty array) — the guard `opts.tags.length > 0` means this behaves as no filter, but this is never explicitly verified.
- Task with no `tags` field when filtering by tag — the `?? []` fallback is not directly tested with a task that has `tags: undefined`.

**`buildTree` — exported but has zero tests**
This is a meaningful recursive function. Missing:
- Building a tree from a known root returns the correct nested structure.
- `buildTree` on a non-existent `rootId` returns `null`.
- Circular parent references (task A is parent of B, B is parent of A) — `getDescendants` and `buildTree` would recurse infinitely. There is no cycle detection. This is a data-integrity bug risk if a user manually edits frontmatter.

**`sortByPriority`**
- Tasks with an unknown/invalid priority string — `PRIORITY_ORDER[x] ?? 99` is the fallback but never tested. Invalid priority would sort to the end.
- Tie-breaking by `created` date — the secondary sort is implemented but not tested. Two tasks with the same priority and different `created` dates should be ordered oldest-first.
- All tasks same priority and same date — stable output expected but not verified.

**`getDescendants`**
- Root with no children — should return `[]`. Currently tested only transitively through `task-1` having children. A leaf node passed as root is not directly tested.

---

### `src/__tests__/core/store.test.ts`

**Quality:** Good. The round-trip test and the invalid-file-skip test are particularly valuable.

**Missing cases:**

**`createTask`**
- Tasks directory does not exist yet — the `mkdir` branch in `createTask` is exercised in the happy path only because `withTempProject` always creates the dir. The branch where the dir is absent (`if (!fs.existsSync(dir)) fs.mkdirSync(...)`) is never actually hit by any test.
- Creating a task with all optional fields populated (`parent`, `related`, `tags`) — `serializeTask` has conditional blocks for each of these; none are exercised from store tests.
- Creating two tasks with the same filename — `fs.writeFileSync` silently overwrites. This is not caught anywhere and represents a data-loss risk if `nextCounter` somehow returns a duplicate.

**`loadTask`**
- File does not exist — `fs.readFileSync` throws a Node error, not a `NodError`. No test verifies the error type or message.
- File exists but `parseFullFile` returns `null` — the code `throw new Error(...)` is hit, but this path is never tested.

**`loadAllSummaries`**
- Tasks directory does not exist at all — the `if (!fs.existsSync(dir)) return []` guard is never tested (the helper always creates the dir).
- Non-`.md` files in the tasks dir (e.g., `.gitkeep`, `.DS_Store`) — the `.endsWith('.md')` filter protects against this but it is never verified.
- Large number of files — not a unit test concern but worth noting for integration.

**`findById`**
- Case sensitivity — `findById(root, 'TASK-7')` would not match `task-7`. No test verifies case-sensitive matching.

**`writeTask`**
- Persisting `related` and `tags` fields — neither optional field is written and re-read in any `writeTask` test.

**`renameTask` — has no tests at all**
This is the riskiest untested store function. It writes a new file then unlinks the old one. Missing:
- Old file is removed after rename.
- New file exists and has correct content.
- New filename collision — if `newFilePath` already exists, the old file's content is silently overwritten.
- `renameTask` failure mid-way (write succeeds, unlink fails) — leaves both files on disk. No test documents this behavior.

---

### `src/utils/format.ts` — No tests exist

This is the most under-tested module relative to its risk. Every task read and write goes through here.

**`parseFile` / `parseFullFile`**
- Valid frontmatter with all optional fields (`parent`, `related`, `tags`) — never tested directly.
- Frontmatter missing a required field (e.g., no `id`) — `isValidFrontmatter` returns `false`; verify `null` is returned.
- Frontmatter with invalid enum value (e.g., `status: 'wip'`) — returns `null`. Not tested.
- Frontmatter with correct fields but wrong types (e.g., `priority: 42`) — `isValidFrontmatter` relies on `typeof` checks; integer priority should return `null`.
- Empty file — `matter('')` returns `{ data: {}, content: '' }`; `isValidFrontmatter` should return `false`. Not tested.
- File with YAML parse error (malformed `---` block) — `gray-matter` may throw; caught by `try/catch`, returns `null`. Not tested.
- `parseFile` vs `parseFullFile` parity — they share `isValidFrontmatter` but `parseFullFile` returns `body`. Both are exercised only indirectly through store tests.

**`serializeTask`**
- Round-trip: `parseFullFile(serializeTask(task), path)` should equal original task (modulo `filePath`). This is the most important single test missing from the entire suite — it would catch any silent corruption in the serialization layer.
- Task with empty `body` — `---\nyaml\n---\n` is valid but edge-case for display.
- Task with `body` that contains `---` lines (YAML front-matter fence in body) — `gray-matter` uses the first `---` block; a body containing `---` could corrupt future parses.
- Task with `related: []` — the guard `related.length > 0` omits the field; this is correct but untested.

**`buildInitialBody`**
- Returns a string containing the title and expected section headings — completely untested.

**`isValidFrontmatter`** (private)
- Tested only indirectly. The full truth table of required fields is never exercised directly.

---

### `src/commands/` — Zero tests across all 12 files

Commands are the integration layer. Pure unit tests are hard here (they call `findNodRoot(process.cwd())`), but the business logic can be extracted and tested, or commands can be invoked against a temp project.

**High-risk untested logic:**

**`create.ts`**
- Parent validation: creating a `subtask` under an `epic` should throw `ValidationError` (wrong parent type). The `ALLOWED_PARENTS` check is the core guard against an invalid task graph and has no test.
- Creating an `epic` with `--parent` — epics have `ALLOWED_PARENTS = []`, so any parent is disallowed, but the code path is more complex (the `else` branch only checks `allowed.length > 0 && taskType !== 'bug'`). An epic with a parent would silently succeed — the `else` branch does nothing for epics.
- Tag parsing: `--tags "a, b, ,c"` — whitespace trimming and empty-string filter behavior.
- Invalid type argument — throws `ValidationError`.
- Invalid priority argument — throws `ValidationError`.
- Counter increments on successful create — not verified.

**`update.ts`**
- Title change triggers file rename — the `titleChanged` branch calls `renameTask`. This entire path has no test.
- `--parent ""` (empty string) — `opts.parent || undefined` converts empty string to `undefined`, which removes the parent. This is intentional but subtle and untested.
- `--related ""` — same empty-string-to-undefined conversion.
- Updating a non-existent task ID — `findById` throws `NotFoundError`; not tested at command level.
- Setting `--status` to the same value already set — `changes.length === 0` causes early return with "No changes" message.
- Counter parsing in rename: `parseInt(id.split('-')[1] ?? '0', 10)` — for an ID like `epic-12`, this correctly parses `12`. But for a non-numeric suffix this would produce `NaN` and `generateFilename` would produce `epic-NaN-new-title.md`. This is a latent bug.

**`note.ts`**
- Appending to a task that has the `## Work Log` heading — happy path, untested.
- Appending to a task that does NOT have the `## Work Log` heading — the fallback branch is untested.
- Multiple notes appended sequentially — verify order is preserved.
- Note text containing special markdown characters (`*`, `_`, `[`, `]`) — no sanitization; this is by design but untested.
- The `nextSectionMatch` branch: a task whose Work Log is followed by another `##` section — the insert-before-next-section logic is untested.

**`init.ts`**
- Running `init` in a directory that already has `.nod/config.json` — prints "Already a nod project" and returns early. Not tested.
- Running `init` when `tasks/` already exists (but `.nod/` does not) — the `!fs.existsSync(tasksDir)` guard prevents re-creating it. Not tested.

---

## Tests That Only Document Rather Than Guard

The following tests pass today but would still pass even if the behavior regressed in a way that matters:

1. **`loadAllSummaries` skips invalid files** — the test checks that only 1 summary is returned but never checks that a warning was emitted to stderr. A silent skip vs. a logged warning is a UX difference that is not guarded.

2. **`sortByPriority` does not mutate** — correct test, but it only checks the `id` ordering of the original, not that the objects themselves are the same references. A deep-copy sort would pass this test even if immutability were not needed.

3. **`nextCounter` increments** — tests the counter at 1, 2, 3 in sequence, but the test would still pass if `nextCounter` started at 0 and the assertion compared to `1` only because the code adds 1 before returning. The fact that the config starts with `counter: 0` and returns `1` is incidentally correct, but there is no test that verifies the persisted config actually changed (i.e., that a second `readConfig` call returns `counter: 3` after three calls).

---

## Risk Ranking for Missing Tests

| Risk | Area | Why It Matters |
|------|------|----------------|
| Critical | `format.ts` round-trip | Silent data corruption on every write |
| Critical | `create.ts` parent type validation | Invalid task graph (epic-under-task) enters silently |
| Critical | `renameTask` | Writes new file then deletes old — partial failure leaves duplicates |
| High | `update.ts` title rename counter parse | `epic-NaN-new-title.md` is a real, reproducible bug |
| High | `buildTree` cycle detection | Infinite recursion on manually edited frontmatter |
| High | `note.ts` Work Log insertion logic | Body corruption on note append |
| High | `generateSlug` empty/all-symbol input | `task-1-.md` filename is invalid on some filesystems |
| Medium | `findNodRoot` traversal | Root detection is core to every command |
| Medium | `isValidFrontmatter` field coverage | Silent null returns mask bad data |
| Low | `init.ts` re-init guard | UX regression only, no data loss |
