import { Command } from 'commander';
import chalk from 'chalk';
import { findNodRoot } from '../core/id.ts';
import { findById, loadAllSummaries } from '../core/store.ts';
import { getDescendants, sortByPriority } from '../core/query.ts';
import { renderTable } from '../utils/display.ts';
import { ValidationError } from '../utils/errors.ts';

export const epicTasksCommand = new Command('epic-tasks')
  .description('List all tasks and subtasks within an epic')
  .argument('<id>', 'Epic ID')
  .option('--json', 'Output as JSON')
  .action((id: string, opts) => {
    const root = findNodRoot(process.cwd());
    const epic = findById(root, id);

    if (epic.type !== 'epic') {
      throw new ValidationError(`${id} is a ${epic.type}, not an epic`);
    }

    const all = loadAllSummaries(root);
    const descendants = sortByPriority(getDescendants(all, id));

    if (opts.json) {
      console.log(JSON.stringify(descendants, null, 2));
    } else {
      if (descendants.length === 0) {
        console.log(chalk.dim(`No tasks in epic ${id}.`));
      } else {
        console.log(chalk.bold(`Tasks in epic: ${id} — ${epic.title}\n`));
        console.log(renderTable(descendants));
      }
    }
  });
