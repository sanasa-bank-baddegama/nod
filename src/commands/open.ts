import { Command } from 'commander';
import { spawnSync } from 'child_process';
import { findNodRoot } from '../core/id.ts';
import { findById } from '../core/store.ts';

export const openCommand = new Command('open')
  .description('Open a task file in $EDITOR')
  .argument('<id>', 'Task ID')
  .action((id: string) => {
    const root = findNodRoot(process.cwd());
    const summary = findById(root, id);
    const editor = process.env['EDITOR'] ?? process.env['VISUAL'] ?? 'vim';
    spawnSync(editor, [summary.filePath], { stdio: 'inherit' });
  });
