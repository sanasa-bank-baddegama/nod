import { Command } from 'commander';
import chalk from 'chalk';
import { findNodRoot } from '../core/id.ts';
import { findById, loadAllSummaries } from '../core/store.ts';
import { getChildren, sortByPriority } from '../core/query.ts';
import { renderTable } from '../utils/display.ts';

export const subtasksCommand = new Command('subtasks')
  .description('List direct children of a task')
  .argument('<id>', 'Task ID')
  .option('--json', 'Output as JSON')
  .action((id: string, opts) => {
    const root = findNodRoot(process.cwd());
    findById(root, id); // validate exists
    const all = loadAllSummaries(root);
    const children = sortByPriority(getChildren(all, id));

    if (opts.json) {
      console.log(JSON.stringify(children, null, 2));
    } else {
      if (children.length === 0) {
        console.log(chalk.dim(`No subtasks for ${id}.`));
      } else {
        console.log(chalk.bold(`Subtasks of ${id}\n`));
        console.log(renderTable(children));
      }
    }
  });
