import { Stream } from './Stream';
import { Terminal } from '~content/terminal';
import { Debug } from '~utils';

const debug = Debug('parser');

export interface Command {
  desc: string;
  run: (stdin: Stream | null, stdout: Stream, env: CommandEnv, args?: any) => void|Promise<void>;
}

export type Commands = { [key: string]: Command }

export interface CommandEnv {
  terminal: Terminal;
  bin: Commands;
  interrupt: boolean;
  onCommandFinish: ((res: any) => void)[];
  helpers: typeof defaultHelpers & { [key: string]: any };
};
export type CommandEnvOpt = Omit<CommandEnv, 'helpers'> & Partial<Pick<CommandEnv, 'helpers'>>;


const defaultHelpers = {
  argsOrStdin: (
    args: string[],
    stdin: Stream | null,
    callback: (data: any) => void) => {
    if (stdin) {
      stdin.receiveAll((data) => callback(data));
    } else {
      callback(args);
    }
  },

  fail: (env: CommandEnv, stdout: Stream, message: string | string[]) => {
    if (Array.isArray(message)) message = message.join(", ");
    env.terminal.error(message);
    if (!stdout.senderClosed) {
      if (stdout.hasReceiver()) {
        stdout.senderClose();
      } else {
        stdout.onReceiver(() => stdout.senderClose());
      }
    }
    return "FAIL";
  }
}

export class CommandParser {
  defaultHelpers = defaultHelpers;
  commandLine: string;
  env: CommandEnv;
  errors: string[];
  parsedCommands: [string, string][];

  constructor(commandLine: string, env: CommandEnvOpt) {
    env.helpers ||= this.defaultHelpers;
    this.commandLine = commandLine;
    this.env = env as CommandEnv;
    this.errors = [];
    this.parsedCommands = [];
  }

  parse() {
    if (this.parsedCommands.length === 0) {
      debug('Parsing %s', this.commandLine);
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
    for (const [command] of this.parsedCommands) {
      if (!this.env.bin[command]) {
        this.errors.push(`Unknown command '${command}'`);
      }
    }
    return this.errors.length === 0;
  }

  execute() {
    this.parse();
    debug('executing: %O', this);

    let stdin: Stream | null = null;
    for (const [command, args] of this.parsedCommands) {
      const cmdOpts = this.env.bin[command];
      const run = cmdOpts.run ||
        ((_stdin: Stream | null, stdout: Stream) =>
          stdout.onReceiver(() => stdout.senderClose()));
      const stdout = new Stream(`stdout for ${command}`);
      run.call(this.env.helpers, stdin, stdout, this.env, args);
      stdin = stdout;
    }
    return stdin;
  }
}
