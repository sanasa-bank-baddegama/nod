import { Command } from 'commander';
import { findNodRoot } from '../core/id.ts';
import { findById, loadTask } from '../core/store.ts';
import { renderTaskDetail } from '../utils/display.ts';

export const getCommand = new Command('get')
  .description('Show a task by ID')
  .argument('<id>', 'Task ID (e.g. task-2)')
  .option('--json', 'Output as JSON')
  .action((id: string, opts) => {
    const root = findNodRoot(process.cwd());
    const summary = findById(root, id);
    const task = loadTask(summary.filePath);

    if (opts.json) {
      console.log(JSON.stringify(task, null, 2));
    } else {
      console.log(renderTaskDetail(task));
    }
  });
