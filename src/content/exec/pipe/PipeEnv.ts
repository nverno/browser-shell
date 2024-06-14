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

  /** Terminate execution and report error message in Terminal. */
  fail(stdout: Pipe, message: string | string[]) {
    if (Array.isArray(message)) message = message.join(", ");
    this.terminal.error(message);
    if (!stdout.writeClosed) {
      // if (stdout.hasReceiver()) {
      //   stdout.closeWrite();
      // } else {
      //   stdout.onReceiver(() => stdout.closeWrite());
      // }
    }
  }
};
