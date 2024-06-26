import { ITerminalOutputOpts, Terminal, terminalOutputDefaultOpts, TerminalOutputType } from "~content/terminal";
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
  pipes: T[] = [];
  outputOpts: Partial<ITerminalOutputOpts> = terminalOutputDefaultOpts;
  onCommandFinish: ((res: any) => void)[];
  helpers: { [key: string]: ExecEnvHelper };
  timers: {
    [key: string | number]: [string, NodeJS.Timeout | string | number, T | null]
  } = {};
  nextTimerId = 0;
  interrupted = 0;

  constructor(terminal: Terminal, opts: ExecEnvOptions<T> = {}) {
    const { bin = undefined, onCommandFinish = [], helpers = {}, extendBin = true } = opts;
    this.terminal = terminal;
    this.onCommandFinish = onCommandFinish;
    this.helpers = helpers;
    this.bin = bin ? (
      extendBin ? Object.assign({}, this.terminal.bin, bin) : bin
    ) : this.terminal.bin;
  }

  /** setInterval wrapper that registers interval */
  setInterval(callback: () => void, ms?: number, stdout?: T) {
    const id = this.nextTimerId++;
    const res = setInterval(callback, ms);
    this.timers[id] = ['interval', res, stdout];
    return [id, res];
  }

  setTimeout(callback: () => void, ms?: number, stdout?: T) {
    const id = this.nextTimerId++;
    debug('timerId=%d, setTimeout: %O', id, callback);
    const res = setTimeout(callback, ms);
    setTimeout(() => delete this.timers[id], ms);
    this.timers[id] = ['timeout', res, stdout];
    return [id, res];
  }

  clearTimer(id: keyof typeof this.timers) {
    const [type, timer, stdout] = this.timers[id];
    if (type === 'interval') {
      clearInterval(timer);
    } else {
      clearTimeout(timer);
    }
    stdout?.closeWrite();
    delete this.timers[id];
  }

  /** Interrupt execution
   * On first interrupt (eg. C-c), sets interrupted to true and allowing
   * commands to handle it themselves.
   * On second interrupt (eg. C-c C-c) cancels all timers. 
   */
  interrupt(hard = false) {
    debug('interrupt: %s', this.interrupted);
    if (hard || this.interrupted === 1) {
      debug('interrupt: cancelling timers %O, closing pipes %O',
        this.timers, this.pipes);
      Object.keys(this.timers).forEach(id => this.clearTimer(id));
      this.pipes.forEach((pipe) => {
        pipe.closeWrite();
        pipe.closeRead();
      });
    }
    this.interrupted++;
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
