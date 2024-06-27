import { Debug, deepMerge, flatten, isEmpty, isString } from "~utils";
import { PipeEnv } from "~/content/exec";
import { Pipe, Reader } from "~content/io";
const debug = Debug('exec:env');

const defaultOpts = {
  requiredArgs: 0,
  flags: null,
  sep: /\s+/,
  splitStdin: false,
  flatten: false,
  name: '',
};
export type ArgOptions = Partial<Omit<typeof defaultOpts, 'splitStdin' | 'flags'> & {
  splitStdin?: boolean | string;
  flags?: string | string[];
}>;

/** Wrapper to read from arguments and/or stdin */
export class ArgsOrStdin {
  env: PipeEnv;
  opts: ArgOptions = defaultOpts;
  stdin?: Reader<Pipe>;
  args: any[] = [];
  flags: { [key: string]: any } = {};

  constructor(env: PipeEnv, stdin = null, args = null, opts?: ArgOptions) {
    this.stdin = stdin;
    this.env = env;
    if (opts) {
      if (opts.flags)
        opts.flags = (Array.isArray(opts.flags) ? opts.flags : opts.flags.split('')).sort();
      this.opts = deepMerge(opts, this.opts);
    }
    if (!isEmpty(args)) {
      this.args = Array.isArray(args) ? args : args.split(this.opts.sep);
    }
    debug('CREATE: %O', this);
  }

  isClosed() {
    return this.args.length === 0 && (!this.stdin || this.stdin.isClosed());
  }

  /** 
   * Read all data from pipe.
   * Blocks until write end is closed.
   * @returns array of input
   */
  async readAll(): Promise<any[]> {
    let res = this.args;
    this.args = [];
    const data = this.stdin ? await this.stdin.readAll() : [];
    res = res.concat(data);
    return this.opts.flatten ? flatten(res) : res;
  }

  /**
   * Read next element from stream pipe.
   * @returns null when there is no more data or there was an interrupt.
   */
  async read(): Promise<any | void> {
    if (this.env.interrupted > 0)
      return null;

    if (this.args.length > 0) {
      return this.args.shift();
    } else if (!this.stdin || this.stdin.isClosed()) {
      return null;
    }

    let data = await this.stdin.read();
    if (isString(data) && this.opts.splitStdin) {
      data = data.split(this.opts.sep);
      return this.opts.flatten ? flatten(data) : data;
    }
    return data;
  }

  /** 
   * Read N elements. 
   * If pipe closes, it may return less than N elements.
   * @returns null when read is closed.
   */
  async readN(n = 1): Promise<any[]> {
    const res = [];
    let cur: any;
    while (n-- > 0 && (cur = await this.read()) != null)
      res.push(cur);
    debug(`readN(%d): %o`, res.length, res);
    return res;
  }

  // Read #required elements not including possible flags.
  async readRequired(): Promise<any[]> {
    debug('reading required: %d', this.opts.requiredArgs);
    await this.readFlags();
    debug('read flags: %o', this.flags);
    return await this.readN(this.opts.requiredArgs);
  }

  flag(flag: string) {
    return this.flags[flag];
  }

  checkFlags(str: string) {
    debug('checkFlags: %s', str);
    const flags = str.split('').sort();
    let i = 0, j = 0;
    while (j < flags.length && flags[j] === '-') ++j;
    while (i < this.opts.flags.length && j < flags.length) {
      const a = this.opts.flags[i], b = flags[j];
      if (a < b) {
        i++;
      } else if (b < a) {
        j++;
      } else {
        i++;
        j++;
      }
    }
    if (j !== flags.length) {
      this.env.fail(`unrecognized flags: ${flags.splice(j).join()}`);
      return null;
    }
    flags.forEach((f) => this.flags[f] = true);
    return true;
  }

  // Consume input while it matches allowed flags
  async readFlags(): Promise<void> {
    if (this.opts.flags) {
      debug('reading flags...');
      let cur: any;
      while ((cur = await this.read()) != null) {
        debug('readFlags: cur=%s', cur);
        if (!(isString(cur) && cur.startsWith('-') && this.checkFlags(cur))) {
          debug(`readFlags: rejecting %s`, cur);
          this.args.unshift(cur);
          return;
        }
        debug(`readFlags: accepted %s, flags=%o`, cur, this.flags);
      }
    }
  }
};
