import { Command } from 'commander';
import chalk from 'chalk';
import { findNodRoot } from '../core/id.ts';
import { loadAllSummaries } from '../core/store.ts';
import { getAvailable, sortByPriority } from '../core/query.ts';
import { renderTable } from '../utils/display.ts';
import type { TaskType } from '../core/types.ts';

export const availableCommand = new Command('available')
  .description('List available tasks (todo or in-progress, not blocked/done/cancelled)')
  .option('--type <type>', 'Filter by type: epic, task, subtask, bug')
  .option('--parent <id>', 'Filter by parent task ID')
  .option('--json', 'Output as JSON')
  .action((opts) => {
    const root = findNodRoot(process.cwd());
    const all = loadAllSummaries(root);

    const available = getAvailable(all, {
      type: opts.type as TaskType | undefined,
      parent: opts.parent as string | undefined,
    });

    const sorted = sortByPriority(available);

    if (opts.json) {
      console.log(JSON.stringify(sorted, null, 2));
    } else {
      if (sorted.length === 0) {
        console.log(chalk.dim('No available tasks.'));
      } else {
        console.log(chalk.bold('Available Tasks\n'));
        console.log(renderTable(sorted));
      }
    }
  });
