import { Terminal } from "~content/terminal";
import { Stream } from "./Stream";
import { Commands } from './CommandParser';
import { Debug } from '~utils';

const debug = Debug('env');

export type CommandEnvOptions = Partial<
  Pick<ExecEnv, 'bin' | 'onCommandFinish' | 'helpers'>> & {
    extendBin?: boolean
  };

export type ExecEnvHelper = (...args: any[]) => void;

/** Execution environment */
export class ExecEnv {
  terminal: Terminal;
  bin: Commands;
  onCommandFinish: ((res: any) => void)[];
  helpers: { [key: string]: ExecEnvHelper };
  timers: {
    [key: string | number]: [string, NodeJS.Timeout | string | number, Stream | null]
  };
  nextTimerId: number;
  interrupted: boolean;

  constructor(terminal: Terminal, opts: CommandEnvOptions = {}) {
    const { bin = undefined, onCommandFinish = [], helpers = {}, extendBin = true } = opts;
    this.terminal = terminal;
    this.onCommandFinish = onCommandFinish;
    this.helpers = helpers;
    this.bin = bin ? (
      extendBin ? Object.assign({}, this.terminal.bin, bin) : bin
    ) : this.terminal.bin;
    this.timers = {};
    this.nextTimerId = 0;
    this.interrupted = false;
  }

  /** setInterval wrapper that registers interval
   * @returns timeout Id
   */
  setInterval(callback: () => void, ms?: number, stdout?: Stream): number {
    const id = this.nextTimerId++;
    this.timers[id] = ['interval', setInterval(callback, ms), stdout];
    return id;
  }

  setTimeout(callback: () => void, ms?: number, stdout?: Stream): number {
    const id = this.nextTimerId++;
    debug('timerId=%d, setTimeout: %O', id, callback);
    this.timers[id] = ['timeout', setTimeout(callback, ms), stdout];
    setTimeout(() => delete this.timers[id], ms);
    return id;
  }

  clearTimer(id: keyof typeof this.timers) {
    const [type, timer, stdout] = this.timers[id];
    if (type === 'interval') {
      clearInterval(timer);
    } else {
      clearTimeout(timer);
    }
    if (stdout && !stdout.senderClosed)
      stdout.senderClose();
    delete this.timers[id];
  }

  /** Interrupt execution
   * On first interrupt (eg. C-c), sets interrupted to true and allowing
   * commands to handle it themselves.
   * On second interrupt (eg. C-c C-c) cancels all timers. 
   */
  interrupt() {
    debug('iterrupt: interrupted(%s), Timers: %O', this.interrupted, this.timers);
    if (this.interrupted) {
      Object.keys(this.timers).forEach(id => this.clearTimer(id));
    } else {
      this.interrupted = true;
    }
  }

  whenTrue(condition: () => boolean, callback: () => void): void {
    const go = () => {
      if (condition()) {
        callback();
      } else {
        this.setTimeout(go, 50);
      }
    };
    go();
  }

  /** Receive input from stdin if non-null or args. */
  argsOrStdin(
    args: any[],
    stdin: Stream | null,
    callback: (data: any) => void
  ) {
    if (stdin) {
      stdin.receiveAll((data) => callback(data));
    } else {
      callback(args);
    }
  }

  /** Terminate execution and report error message in Terminal. */
  fail(stdout: Stream, message: string | string[]) {
    if (Array.isArray(message)) message = message.join(", ");
    this.terminal.error(message);
    if (!stdout.senderClosed) {
      if (stdout.hasReceiver()) {
        stdout.senderClose();
      } else {
        stdout.onReceiver(() => stdout.senderClose());
      }
    }
  }
};
