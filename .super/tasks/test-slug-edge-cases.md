---
title: Test generateSlug edge cases (empty, symbol-only, boundary values)
description: |
  src/core/id.ts generateSlug has untested edge cases that produce broken
  filenames in the real CLI.

  Write additional cases in src/__tests__/core/id.test.ts:

  1. Empty string input — generateSlug('') should return '' (verify behavior,
     then guard it; a filename of 'task-1-.md' from an empty slug may be
     undesirable or invalid on some systems).

  2. All non-alphanumeric input — generateSlug('!!!') returns '' after strip.
     Same filename risk as above.

  3. Title that slugifies to exactly 50 chars — confirm no truncation fires
     and no trailing hyphen.

  4. Title that slugifies to 51 chars — confirm truncation fires, result is
     <= 50 chars, and result does not end with a hyphen.

  5. Title with leading/trailing non-alphanumeric chars ('  *** hello ***  ')
     should produce 'hello'.

  6. Unicode: 'Fix naïve bug' — verify the output is 'fix-na-ve-bug' or
     similar (document actual behavior as the spec).

  Also add tests for findNodRoot in src/__tests__/core/id.test.ts:

  7. findNodRoot starting in a child directory of a project root — should
     return the root, not the child directory.

  8. findNodRoot starting in a directory with no .nod ancestor — should
     throw NotInProjectError.

  9. readConfig on a config file containing invalid JSON — should propagate
     a parse error (currently uncaught; this test will document the current
     crash behavior so any future improvement is regression-guarded).
status: todo
created: 2026-04-05
assignee: super-tester
---
