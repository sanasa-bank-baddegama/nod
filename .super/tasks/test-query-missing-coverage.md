---
title: Test buildTree, sortByPriority tie-breaking, and filterTasks edge cases
description: |
  src/core/query.ts exports buildTree which has zero tests. sortByPriority
  has an untested secondary sort. filterTasks has a subtle parent=undefined
  distinction that is not verified.

  Write additional cases in src/__tests__/core/query.test.ts:

  buildTree:
  1. buildTree on a valid root ID returns a TreeNode with correct nested
     children (e.g., epic -> [task -> [subtask-1, subtask-2], task-2]).
  2. buildTree on a non-existent ID returns null.
  3. buildTree on a leaf node returns a TreeNode with children: [].

  Cycle detection (document current behavior):
  4. Given tasks where A.parent = B and B.parent = A, calling getDescendants
     or buildTree on A produces infinite recursion. Write a test that
     documents this (skip or expect timeout if needed) and creates a tracking
     issue. This is a data-integrity risk for hand-edited frontmatter.

  sortByPriority:
  5. Two tasks with equal priority, different created dates — older task
     (earlier date) sorts first (secondary sort by created ASC).
  6. Two tasks with unknown priority string — both sort to end, relative
     order is stable by created date.

  filterTasks:
  7. Empty tasks array with any opts — returns [].
  8. Empty opts object {} — returns all tasks unchanged.
  9. opts.tags = [] (empty array) — behaves as no tag filter, returns all tasks.
  10. Filtering by parent where some tasks have tags: undefined — does not crash.

  getDescendants:
  11. Leaf node as rootId — returns [].
status: todo
created: 2026-04-05
assignee: super-tester
---
