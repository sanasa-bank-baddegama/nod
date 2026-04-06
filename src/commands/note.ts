import { Command } from 'commander';
import chalk from 'chalk';
import { findNodRoot } from '../core/id.ts';
import { findById, loadTask, writeTask } from '../core/store.ts';

const WORK_LOG_HEADING = '## Work Log';

export const noteCommand = new Command('note')
  .description('Append a note to a task\'s Work Log')
  .argument('<id>', 'Task ID')
  .argument('<text>', 'Note text')
  .action((id: string, text: string) => {
    const root = findNodRoot(process.cwd());
    const summary = findById(root, id);
    const task = loadTask(summary.filePath);

    const today = new Date().toISOString().slice(0, 10);
    const entry = `- ${today}: ${text}`;

    let body = task.body;
    const headingIndex = body.indexOf(WORK_LOG_HEADING);

    if (headingIndex !== -1) {
      // Find end of Work Log section (next ## heading or end of file)
      const afterHeading = headingIndex + WORK_LOG_HEADING.length;
      const nextSectionMatch = body.slice(afterHeading).match(/\n## /);
      const insertAt = nextSectionMatch
        ? afterHeading + (nextSectionMatch.index ?? 0)
        : body.length;

      // Insert entry before next section (or at end)
      const before = body.slice(0, insertAt).trimEnd();
      const after = body.slice(insertAt);
      body = `${before}\n${entry}\n${after ? '\n' + after.trimStart() : ''}`;
    } else {
      // Append Work Log section
      body = body.trimEnd() + `\n\n${WORK_LOG_HEADING}\n\n${entry}\n`;
    }

    writeTask({ ...task, body });
    console.log(chalk.green(`Note added to ${id}`));
    console.log(chalk.dim(`  ${entry}`));
  });
