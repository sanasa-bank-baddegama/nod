import { Command } from 'commander';
import chalk from 'chalk';
import { findNodRoot } from '../core/id.ts';
import { findById, loadAllSummaries } from '../core/store.ts';
import { buildTree } from '../core/query.ts';
import { renderTree } from '../utils/display.ts';

export const treeCommand = new Command('tree')
  .description('Show a visual tree of task hierarchy')
  .argument('<id>', 'Root task ID')
  .action((id: string) => {
    const root = findNodRoot(process.cwd());
    findById(root, id); // validate exists
    const all = loadAllSummaries(root);
    const tree = buildTree(all, id);

    if (!tree) {
      console.log(chalk.red(`Task not found: ${id}`));
      process.exit(2);
    }

    console.log(renderTree(tree));
  });
