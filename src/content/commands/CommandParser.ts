import { ExecEnv } from './ExecEnv';
import { Stream } from './Stream';
import { Debug } from '~utils';

const debug = Debug('parser');

export interface Command {
  desc: string;
  run: (
    env: ExecEnv,
    stdin: Stream | null,
    stdout: Stream,
    args?: any
  ) => void | Promise<void>;
  alias?: string;
}
export type Commands = { [key: string]: Command }

export class CommandParser {
  commandLine: string;
  env: ExecEnv;
  errors: string[];
  parsedCommands: [string, string][];

  constructor(commandLine: string, env: ExecEnv) {
    this.commandLine = commandLine;
    this.env = env;
    this.errors = [];
    this.parsedCommands = [];
  }

  parse() {
    if (this.parsedCommands.length === 0) {
      // FIXME(5/30/24): dont split on '|' in strings
      for (const line of this.commandLine.split(/\s*\|\s*/)) {
        const firstSpace = line.indexOf(" ");
        if (firstSpace !== -1) {
          this.parsedCommands.push([
            line.slice(0, firstSpace),
            line.slice(firstSpace + 1)
          ]);
        } else {
          this.parsedCommands.push([line, ""]);
        }
      }
    }
    return this.parsedCommands;
  }

  isValid() {
    this.parse();
    this.parsedCommands.forEach(([cmd]) => {
      if (!this.env.bin[cmd])
        this.errors.push(`Unknown command: ${cmd}`);
    });
    return this.errors.length === 0;
  }

  execute() {
    this.parse();
    debug('executing: %O', this);

    let stdin: Stream | null = null;
    for (const [cmd, args] of this.parsedCommands) {
      const cmdOpts = this.env.bin[cmd];
      const run = cmdOpts.run ||
        ((_stdin: Stream | null, stdout: Stream) =>
          stdout.onReceiver(() => stdout.senderClose()));
      const stdout = new Stream(`stdout<${cmd}>`);
      run.call(this.env, this.env, stdin, stdout, args);
      stdin = stdout;
    }
    return stdin;
  }
}
