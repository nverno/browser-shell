import { Pipe } from "~content/io";
import { ExecEnv, ExecEnvOptions } from "../ExecEnv";
import { Terminal } from "~content/terminal";

// import { Debug } from '~utils';
// const debug = Debug('env');

/** Execution environment */
export class PipeEnv extends ExecEnv<Pipe> {
  constructor(terminal: Terminal, opts: ExecEnvOptions<Pipe> = {}) {
    super(terminal, opts);
  }

  /** Receive input from stdin if non-null or args. */
  argsOrStdin(
    args: any[],
    stdin: Pipe | null,
    callback: (data: any) => void
  ) {
    if (stdin) {
      // stdin.receiveAll((data) => callback(data));
    } else {
      callback(args);
    }
  }

  /** Check command arguments */
  checkArgs(count: number, args: any, exact = false) {
    if ((exact && args?.length !== count) || (!exact && args?.length < count)) {
      this.terminal.error(`expected ${count} arguments, but got: ${args?.join(", ")}`);
      this.interrupt(true);
    }
  }

  /** Terminate execution and report error message in Terminal. */
  fail(stdout: Pipe, message: string | string[]) {
    if (Array.isArray(message)) message = message.join(", ");
    this.terminal.error(message);
    stdout.closeWrite();
    // if (!stdout.writeClosed) {
    // if (stdout.hasReceiver()) {
    //   stdout.closeWrite();
    // } else {
    //   stdout.onReceiver(() => stdout.closeWrite());
    // }
  }
};
