import { Stream } from "~content/io";
import { ExecEnv, ExecEnvOptions } from "~content/exec";
import { Terminal } from "~content/terminal";
// import { Debug } from '~utils';
// const debug = Debug('env');

/** Execution environment */
export class StreamEnv extends ExecEnv<Stream> {
  constructor(terminal: Terminal, opts: ExecEnvOptions<Stream> = {}) {
    super(terminal, opts);
  }

  /** Receive input from stdin if non-null or args. */
  argsOrStdin(
    args: any[],
    stdin: Stream | null,
    callback: (data: any) => void
  ) {
    if (stdin) {
      stdin.readAll((data) => callback(data));
    } else {
      callback(args);
    }
  }

  /** Terminate execution and report error message in Terminal. */
  fail(stdout: Stream, message: string | string[]) {
    if (Array.isArray(message)) message = message.join(", ");
    this.terminal.error(message);
    if (!stdout.writeClosed) {
      if (stdout.hasReader()) {
        stdout.closeWrite();
      } else {
        stdout.onRead(() => stdout.closeWrite());
      }
    }
  }
};
