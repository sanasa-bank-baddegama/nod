# nod

A task manager where each task is a markdown file. Works great with git and Claude Code.

## How it works

Each task lives in its own `.md` file inside a `tasks/` folder:

```
tasks/
  epic-1-onboarding.md
  task-2-setup-database.md
  subtask-3-write-migrations.md
```

Tasks have a header (frontmatter) with fields like status, priority, and parent. The rest of the file is free-form markdown — notes, research, work log, anything you want.

Because tasks are plain files, you can commit them to git, review diffs, and read them in any editor.

## Install

Requires [Bun](https://bun.sh).

```bash
cd nod
bun install
bun link
```

After linking, the `nod` command is available anywhere.

## Quick start

```bash
# Set up a project
cd my-project
nod init

# Create tasks
nod create epic "Build auth system"
nod create task "Design database schema" --parent epic-1 --priority high
nod create subtask "Write migrations" --parent task-2
nod create bug "Fix token expiry" --parent task-2

# See what to work on
nod available

# Claim a task
nod update task-2 --status in-progress

# Add a note
nod note task-2 "Decided to use UUIDs for user IDs"

# See all tasks in an epic
nod epic-tasks epic-1

# Visual tree
nod tree epic-1
```

## Task types

| Type | Description | Can have parent |
|------|-------------|----------------|
| `epic` | A large goal or feature | No |
| `task` | A piece of work | epic |
| `subtask` | A small step inside a task | task, bug |
| `bug` | A defect to fix | epic, task |

## Task file format

```markdown
---
id: task-2
title: "Design database schema"
type: task
status: todo
priority: high
parent: epic-1
tags:
  - database
created: 2026-04-05
updated: 2026-04-05
---

# Design database schema

Decide on the tables and relationships for the auth system.

## Notes

Looking at PostgreSQL with UUID primary keys.

## Work Log

- 2026-04-05: Started research on schema options
```

## Commands

### `nod init`
Set up a new nod project in the current directory. Creates `.nod/` and `tasks/`.

### `nod create <type> <title>`
Create a new task.

```bash
nod create epic "Launch v2"
nod create task "Write tests" --parent epic-1 --priority high
nod create bug "Crash on logout" --parent task-3 --tags auth,critical
```

Options: `--parent <id>`, `--priority <p>`, `--tags <t1,t2>`

### `nod list`
List tasks. Filter by any field.

```bash
nod list
nod list --status todo
nod list --priority high
nod list --type task --parent epic-1
nod list --json
```

### `nod available`
Show tasks that are ready to work on (`todo` or `in-progress`). Sorted by priority.

```bash
nod available
nod available --json   # for Claude Code
```

### `nod get <id>`
Show a task's full content.

```bash
nod get task-2
nod get task-2 --json
```

### `nod update <id>`
Change task fields.

```bash
nod update task-2 --status in-progress
nod update task-2 --priority critical
nod update task-2 --title "New title"
nod update task-2 --tags backend,auth
```

### `nod note <id> <text>`
Append a note with today's date to the Work Log section.

```bash
nod note task-2 "Decided to use UUIDs"
```

### `nod subtasks <id>`
List direct children of a task.

```bash
nod subtasks task-2
nod subtasks task-2 --json
```

### `nod epic-tasks <id>`
List all tasks and subtasks inside an epic.

```bash
nod epic-tasks epic-1
nod epic-tasks epic-1 --json
```

### `nod tree <id>`
Show the task hierarchy as a tree.

```bash
nod tree epic-1
# epic-1 [in-progress] Launch v2
# └── task-2 [todo] Write tests
#     └── subtask-3 [todo] Add edge cases
```

### `nod open <id>`
Open the task file in your `$EDITOR`.

```bash
nod open task-2
```

## Statuses

`todo` → `in-progress` → `done`  
Also: `blocked`, `cancelled`

## Priorities

`critical`, `high`, `medium`, `low`

## Using with Claude Code

Claude Code can manage tasks with these patterns:

**Find the next task:**
```bash
nod available --json
```

**Read a task before starting:**
```bash
nod get task-2 --json
```

**Claim and complete a task:**
```bash
nod update task-2 --status in-progress
# ... do the work ...
nod note task-2 "Completed. Changed X because Y."
nod update task-2 --status done
```

**Check epic progress:**
```bash
nod epic-tasks epic-1 --json
```

## Build a standalone binary

```bash
bun run build
# Creates dist/nod — a single file, no Bun required
```
