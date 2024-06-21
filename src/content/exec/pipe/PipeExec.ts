import { CommandExec, CommandParser, ExecEnv } from "~content/exec";
import { Pipe, Reader, Writer } from '~content/io';
import { PipeEnv } from '~content/exec/pipe';
import { Debug } from '~utils';
const debug = Debug('exec:pipe');

export class PipeExec extends CommandParser<PipeEnv> implements CommandExec<ExecEnv<Pipe>> {
  constructor(commandLine: string, env: PipeEnv) {
    super(commandLine, env);
  }

  execute() {
    this.parse();
    debug('executing: %O', this);

    const n = this.parsedCommands.length;
    let cnt = 1;
    let pipe: Pipe = null;

    for (let i = 0; i < n; i++) {
      const [cmd, args] = this.parsedCommands[i];
      const cmdOpts = this.env.bin[cmd];
      const run = cmdOpts.run ||
        ((stdin: Reader<Pipe> | null, stdout: Writer<Pipe>) => {
          stdin.close();
          stdout.close();
        });
      const stdin = pipe ? pipe.openReader() : null;
      pipe = new Pipe(`pipe<${cmd}.${cnt++}>`);
      this.env.pipes.push(pipe);
      try {
        run.call(this.env, this.env, stdin, pipe.openWriter(), args);
      } catch (err) {
        console.error(err);
        this.env.terminal.error(err)
        break;
      }
    }
    return pipe.openReader();
  }
};
