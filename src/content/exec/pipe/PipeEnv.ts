import { Pipe, Reader, Writer } from "~content/io";
import { ExecEnv, ExecEnvOptions } from "~content/exec";
import { Terminal } from "~content/terminal";
import { isError } from "lodash";

// import { Debug } from '~utils';
// const debug = Debug('exec:env');

/** Execution environment */
export class PipeEnv extends ExecEnv<Pipe> {
  constructor(terminal: Terminal, opts: ExecEnvOptions<Pipe> = {}) {
    super(terminal, opts);
  }

  /** Forward input from stdin to stdout */
  async forward(stdin: null | Reader<Pipe>, stdout: Writer<Pipe>) {
    if (stdin) {
      let cur: any;
      while ((cur = await stdin.read()) != null)
        stdout.write(cur);
    }
    stdout.close();
  }

  /** Check command arguments */
  checkArgs(count: number, args: any, exact = false) {
    if ((exact && args?.length !== count) || (!exact && args?.length < count)) {
      this.terminal.error(`expected ${count} arguments, but got: ${args?.join(", ")}`);
      this.interrupt(true);
    }
  }

  /** Terminate execution and report error message in Terminal. */
  fail(message: string | string[], stdout?: Writer<Pipe>) {
    if (Array.isArray(message)) message = message.map(el => el.toString()).join(", ");
    else if (isError(message)) message = message.toString();
    this.terminal.error(message);
    stdout?.close();
  }
};
