---
title: Test renameTask and the update command title-rename path
description: |
  src/core/store.ts exports renameTask but it has zero tests. It is also the only
  store function called from update.ts when a title changes. Two failure modes:
  - Write succeeds but unlink fails: leaves both old and new files on disk.
  - New filename already exists: old content silently overwritten.

  Additionally, src/commands/update.ts has a latent bug in the rename path:
    parseInt(id.split('-')[1] ?? '0', 10)
  For an ID like 'epic-12' this produces 12 (correct). For 'task-abc' this
  produces NaN and the filename becomes 'task-NaN-new-title.md'.

  Write tests in src/__tests__/core/store.test.ts and
  src/__tests__/commands/update.test.ts covering:

  renameTask:
  1. Old file is deleted after rename.
  2. New file exists and its parsed frontmatter matches the original.
  3. The returned Task has the new filePath.
  4. Collision: if newFilename already exists, document whether it overwrites
     or errors (currently it overwrites silently — this should be flagged).

  update command rename path:
  5. Updating --title on task-3 produces a file named task-3-<new-slug>.md
     and the old file is removed.
  6. The counter-parse bug: verify that updating --title on a task whose
     counter part is numeric works, and add a test that documents/guards
     the NaN case.
status: todo
created: 2026-04-05
assignee: super-tester
---
