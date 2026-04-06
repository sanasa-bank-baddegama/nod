import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import type { NodConfig } from '../core/types.ts';

export const initCommand = new Command('init')
  .description('Initialize a nod project in the current directory')
  .action(() => {
    const root = process.cwd();
    const nodDir = path.join(root, '.nod');
    const configPath = path.join(nodDir, 'config.json');
    const tasksDir = path.join(nodDir, 'tasks');

    if (fs.existsSync(configPath)) {
      console.log(chalk.yellow('Already a nod project.') + ` Config: ${configPath}`);
      return;
    }

    fs.mkdirSync(nodDir, { recursive: true });

    const config: NodConfig = { counter: 0, version: '1' };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');

    if (!fs.existsSync(tasksDir)) {
      fs.mkdirSync(tasksDir);
      fs.writeFileSync(path.join(tasksDir, '.gitkeep'), '', 'utf8');
    }

    console.log(chalk.green('Initialized nod project.'));
    console.log(`  Config: ${configPath}`);
    console.log(`  Tasks:  ${tasksDir}`);
  });
