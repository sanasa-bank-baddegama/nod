---
title: Test create command parent-type validation and edge cases
description: |
  src/commands/create.ts contains parent-type validation against ALLOWED_PARENTS
  that has zero test coverage. A bug here lets an invalid task graph enter the
  store silently.

  Write integration-style tests (using a temp project on disk) in
  src/__tests__/commands/create.test.ts covering:

  1. Creating a subtask under an epic should throw ValidationError.
     ALLOWED_PARENTS['subtask'] = ['task', 'bug'], not 'epic'.

  2. Creating a task under a subtask should throw ValidationError.
     ALLOWED_PARENTS['task'] = ['epic'], not 'subtask'.

  3. Creating an epic with --parent set to any existing task ID should
     succeed silently today (the else branch does nothing for epics).
     This is a latent bug — document the current behavior and decide whether
     epics should reject a --parent flag entirely, then add a test that
     guards the chosen behavior.

  4. Creating with --parent pointing to a non-existent ID throws ValidationError
     with message "Parent task not found: <id>".

  5. Invalid type argument throws ValidationError.

  6. Invalid priority argument throws ValidationError.

  7. Tag parsing: --tags "a, b, , c" produces ['a', 'b', 'c'] (no empty strings,
     whitespace trimmed).

  8. Counter increments: two sequential creates produce task-1 and task-2.

  Approach: extract the action callback into a pure function that accepts
  (type, title, opts, root) so it can be tested without process.cwd() coupling,
  OR invoke the action against a temp project directory.
status: todo
created: 2026-04-05
assignee: super-tester
---
