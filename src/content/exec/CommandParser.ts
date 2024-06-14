import { PipeBase } from '~content/io';
import { ExecEnv } from './ExecEnv';
// import { Debug } from '~utils';
// const debug = Debug('parser');

export interface Command<T extends PipeBase, E = ExecEnv<T>> {
  desc: string;
  run: (
    env: E,
    stdin: T | null,
    stdout: T,
    args?: any
  ) => void | Promise<void>;
  alias?: string;
}
export type Commands<T extends PipeBase, E = ExecEnv<T>> = { [key: string]: Command<T, E> }

/** Interface to parse and execute command lines */
export interface CommandExec<E extends ExecEnv<PipeBase>> extends CommandParser<E> {
  execute(): void;
}

export class CommandParser<E extends ExecEnv<PipeBase>> {
  commandLine: string;
  env: E;
  errors: string[];
  parsedCommands: [string, string][];

  constructor(commandLine: string, env: E) {
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
};
