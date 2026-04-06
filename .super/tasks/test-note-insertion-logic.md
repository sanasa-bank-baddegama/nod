---
title: Test note command Work Log insertion logic
description: |
  src/commands/note.ts has three distinct body-mutation branches, none of which
  are tested:

  Branch 1 (Work Log heading found, no subsequent ## section):
    The entry is inserted at the end of the body after the heading.

  Branch 2 (Work Log heading found, followed by another ## section):
    nextSectionMatch fires. The entry is inserted between the Work Log heading
    and the next section. This is the trickiest branch — the regex and index
    arithmetic are easy to get off-by-one.

  Branch 3 (No Work Log heading at all):
    A new '## Work Log' section is appended to the body.

  Write tests in src/__tests__/commands/note.test.ts covering:

  1. Task with empty Work Log section — note appears under heading.
  2. Task with existing note in Work Log — new note is appended after the
     existing entry (not prepended, not duplicated).
  3. Task with Work Log followed by another ## section (e.g., '## Notes') —
     new entry appears before '## Notes', not after it.
  4. Task with no Work Log heading — heading is created and note appears under it.
  5. Two sequential note calls — both entries appear in order, oldest first.
  6. Note text containing markdown special chars (* _ [ ] #) — stored verbatim.

  Use a temp project with createTask + loadTask to verify the persisted body,
  not just the in-memory string.
status: todo
created: 2026-04-05
assignee: super-tester
---
