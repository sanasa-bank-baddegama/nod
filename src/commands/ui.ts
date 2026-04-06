import { Command } from 'commander';
import { createServer } from '../ui/server.ts';

const DEFAULT_PORT = 7777;

export const uiCommand = new Command('ui')
  .description('Start the Kanban web UI')
  .option('-p, --port <port>', 'Port to listen on', String(DEFAULT_PORT))
  .action(async (opts: { port: string }) => {
    const port = parseInt(opts.port, 10) || DEFAULT_PORT;
    const url = `http://localhost:${port}`;

    const server = createServer(port);

    console.log(`nod ui running at ${url}`);
    console.log('Press Ctrl+C to stop.');

    // Open browser
    Bun.spawn(['open', url], { stdio: ['ignore', 'ignore', 'ignore'] });

    // Keep process alive until signal
    process.on('SIGINT', () => {
      server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      server.stop();
      process.exit(0);
    });

    // Bun.serve keeps the process alive by itself, but we add an
    // explicit never-resolving promise just to be safe in case
    // the event loop would otherwise drain.
    await new Promise<void>(() => {});
  });
