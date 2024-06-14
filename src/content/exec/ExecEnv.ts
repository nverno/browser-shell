import { Terminal } from "~content/terminal";
import { Commands } from '~content/exec';
import { Debug } from '~utils';
import { PipeBase } from '~content/io';

const debug = Debug('exec');

export type ExecEnvOptions<T extends PipeBase> = Partial<
  Pick<ExecEnv<T>, 'bin' | 'onCommandFinish' | 'helpers'>> & {
    extendBin?: boolean
  };

export type ExecEnvHelper = (...args: any[]) => void;

/** Execution environment for shell commands */
export class ExecEnv<T extends PipeBase> {
  terminal: Terminal;
  bin: Commands<T>;
  onCommandFinish: ((res: any) => void)[];
  helpers: { [key: string]: ExecEnvHelper };
  timers: {
    [key: string | number]: [string, NodeJS.Timeout | string | number, T | null]
  };
  nextTimerId: number;
  interrupted: boolean;

  constructor(terminal: Terminal, opts: ExecEnvOptions<T> = {}) {
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
  setInterval(callback: () => void, ms?: number, stdout?: T): number {
    const id = this.nextTimerId++;
    this.timers[id] = ['interval', setInterval(callback, ms), stdout];
    return id;
  }

  setTimeout(callback: () => void, ms?: number, stdout?: T): number {
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
    if (stdout && !stdout.writeClosed)
      stdout.closeWrite();
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
};
