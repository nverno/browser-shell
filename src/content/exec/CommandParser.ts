import { Pipe, PipeBase, Reader, Writer } from '~content/io';
import { ExecEnv } from './ExecEnv';
import { PipeEnv } from './pipe';
// import { Debug } from '~utils';
// const debug = Debug('parser');

export interface CommandBase<T extends PipeBase, E = ExecEnv<T>> {
  desc: string;
  help?: string[],
  run?: (
    env: E,
    stdin: Reader<T> | null,
    stdout: Writer<T>,
    args?: any
  ) => void | Promise<void>;
  alias?: string[];
}
export type CommandsBase<T extends PipeBase, E = ExecEnv<T>> = { [key: string]: CommandBase<T, E> }
export type Command = CommandBase<Pipe, PipeEnv>;
export type Commands = CommandsBase<Pipe, PipeEnv>;

/** Interface to parse and execute command lines */
export interface CommandExec<E extends ExecEnv<PipeBase>> extends CommandParser<E> {
  execute(): void;
}

export class CommandParser<E extends ExecEnv<PipeBase>> {
  errors: string[] = [];
  parsedCommands: [string, string][] = [];
  commandLine: string;
  env: E;

  constructor(commandLine: string, env: E) {
    this.commandLine = commandLine;
    this.env = env;
  }

  // TODO(7/9/24): Parsing to allow for localized settings (how??)
  // FIXME(5/30/24): dont split on '|' in strings
  parse() {
    if (this.parsedCommands.length === 0) {
      for (const line of this.commandLine.split(/\s*\|\s*/)) {
        const firstSpace = line.indexOf(" ");
        if (firstSpace !== -1) {
          this.parsedCommands.push([
            line.slice(0, firstSpace),
            line.slice(firstSpace + 1)
          ]);
        } else {
          this.parsedCommands.push([line, null]);
        }
      }
    }
    return this.parsedCommands;
  }

  // Check all commands are valid (replacing aliases with commands)
  isValid() {
    this.parse();
    this.parsedCommands.forEach(([cmd], idx) => {
      if (!this.env.bin[cmd]) {
        const alias = this.env.terminal.alias[cmd];
        if (alias) {
          this.parsedCommands[idx][0] = alias;
        } else {
          this.errors.push(`Unknown command: ${cmd}`);
        }
      }
    });
    return this.errors.length === 0;
  }
};
