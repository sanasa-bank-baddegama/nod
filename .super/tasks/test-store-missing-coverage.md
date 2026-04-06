---
title: Test store.ts missing branches (tasks dir absent, optional fields, loadTask errors)
description: |
  Several branches in src/core/store.ts are never reached by the existing tests
  because withTempProject always creates the tasks directory upfront.

  Add cases to src/__tests__/core/store.test.ts:

  createTask:
  1. Tasks directory does not exist — createTask must create it (the
     mkdirSync branch). Set up a temp project WITHOUT creating tasks/ and
     verify createTask still succeeds.
  2. Task created with all optional fields set (parent, related, tags) —
     reload with loadTask and verify all fields are present.

  loadTask:
  3. File does not exist — verify the error thrown (currently a raw Node
     ENOENT, not a NodError; document this so a future improvement is guarded).
  4. File exists but parseFullFile returns null — verify 'Failed to parse
     task file' error is thrown.

  loadAllSummaries:
  5. Tasks directory does not exist — returns [] (the existsSync guard).
     Currently never hit because the helper always creates the dir.
  6. Tasks dir contains non-.md files (.gitkeep, .DS_Store) — they are
     skipped and do not affect the count.

  findById:
  7. ID lookup is case-sensitive: 'TASK-7' does not match 'task-7'.

  writeTask:
  8. Write and re-read a task with related and tags fields set — verify
     both survive the serialize/parse cycle.

  Suggested approach: create a variant of withTempProject that accepts an option
  to skip tasks/ directory creation, avoiding duplication.
status: todo
created: 2026-04-05
assignee: super-tester
---
