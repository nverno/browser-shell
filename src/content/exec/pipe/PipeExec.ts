import { Debug } from '~utils';
import { CommandExec, CommandParser, ExecEnv } from "~content/exec";
import { Pipe } from '~content/io';
import { PipeEnv } from '~content/exec/pipe';

const debug = Debug('exec');


export class PipeExec extends CommandParser<PipeEnv> implements CommandExec<ExecEnv<Pipe>> {
  constructor(commandLine: string, env: PipeEnv) {
    super(commandLine, env);
  }

  execute() {
    this.parse();
    debug('executing: %O', this);
  }
};
