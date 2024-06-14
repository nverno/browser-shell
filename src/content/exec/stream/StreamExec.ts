import { type ExecEnv, CommandExec, CommandParser } from '~content/exec';
import { Stream, sendSigPipe } from '~content/io';
import { Debug } from '~utils';
import { StreamEnv } from './StreamEnv';
const debug = Debug('parser');

export class StreamExec extends CommandParser<StreamEnv> implements CommandExec<ExecEnv<Stream>> {
  constructor(commandLine: string, env: StreamEnv) {
    super(commandLine, env);
  }

  execute() {
    this.parse();
    debug('executing: %O', this);

    let stdin: Stream | null = null;
    for (const [cmd, args] of this.parsedCommands) {
      const cmdOpts = this.env.bin[cmd];
      const run = cmdOpts.run ||
        ((_stdin: Stream | null, stdout: Stream) =>
          stdout.onRead(() => stdout.closeWrite()));
      const stdout = new Stream(`stdout<${cmd}>`);
      try {
        run.call(this.env, this.env, stdin, stdout, args);
        stdin = stdout;
      } catch (err) {
        console.error(err);
        this.env.terminal.error(err)
        break;
      }
    }
    return stdin;
  }
}
