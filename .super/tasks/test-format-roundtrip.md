---
title: Add tests for format.ts serialization/deserialization (round-trip, edge cases)
description: |
  src/utils/format.ts has zero test coverage despite being the serialization layer
  that every read and write in the codebase depends on.

  Write tests in src/__tests__/utils/format.test.ts covering:

  1. Round-trip: parseFullFile(serializeTask(task), path) must equal the
     original task (all fields, including optional parent/related/tags).
     This is the single highest-value missing test in the suite.

  2. serializeTask omits optional fields when absent:
     - related: [] must NOT appear in output YAML
     - tags: [] must NOT appear in output YAML
     - parent: undefined must NOT appear in output YAML

  3. parseFile / parseFullFile return null for:
     - Empty file
     - File with no frontmatter (plain text)
     - Frontmatter missing required field (no id, no status, etc.)
     - Frontmatter with invalid enum value (status: 'wip', priority: 5)
     - Malformed YAML (unclosed quote in frontmatter)

  4. Task body containing '---' lines:
     Verify that a body with YAML-fence-like content does not corrupt a
     subsequent parse. This is a gray-matter edge case.

  5. buildInitialBody:
     - Returns a string containing the title in a # heading
     - Contains '## Notes' and '## Work Log' sections
status: todo
created: 2026-04-05
assignee: super-tester
---
