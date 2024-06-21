import { Pipe, Reader, Writer } from "~content/io";
import { ExecEnv, ExecEnvOptions } from "../ExecEnv";
import { Terminal } from "~content/terminal";
import { deepMerge, flatten, isEmpty, isString } from "~utils";
import { isError } from "lodash";

// import { Debug } from '~utils';
// const debug = Debug('env');

const argOptions = {
  requiredArgs: 0,
  readAll: false,
  sep: /\s+/,
  splitStdin: false,
  flatten: false,
  name: '',
};
type ArgOptions = Partial<Omit<typeof argOptions, 'splitStdin'> & {
  splitStdin?: boolean | string;
}>;

/** Wrapper to read from arguments and/or stdin */
export class ArgsOrStdin {
  env: PipeEnv;
  opts: ArgOptions = argOptions;
  stdin?: Reader<Pipe>;
  args: any[] = [];

  constructor(env: PipeEnv, stdin=null, args='', opts?: ArgOptions) {
    this.stdin = stdin;
    this.env = env;
    if (opts) {
      this.opts = deepMerge(opts, this.opts);
    }
    if (!isEmpty(args)) {
      this.args = Array.isArray(args) ? args : args.split(this.opts.sep);
    }
  }

  isClosed() {
    return this.args.length === 0 && this.stdin?.isClosed();
  }

  // Read all data, blocking until write is closed.
  async readAll(): Promise<any[]> {
    let res = this.args;
    this.args = [];
    const data = this.stdin ? await this.stdin.readAll() : [];
    res = res.concat(data);
    return this.opts.flatten ? flatten(res) : res;
  }

  // Read next element. Returns null when no more data.
  async read(): Promise<any|void> {
    if (!this.env.interrupted)
      return null;

    if (this.args.length > 0) {
      return this.args.shift();
    } else if (!this.stdin || this.stdin.isClosed()) {
      return null;
    } 

    let data = await this.stdin.read();
    if (this.opts.splitStdin && isString(data)) {
      data = data.split(this.opts.sep);
      return this.opts.flatten ? flatten(data) : data;
    }
    return data;
  }

  // Read N elements. If pipe closes, it may return less than N elements.
  // Returns null when read is closed.
  async readN(n = 1): Promise<any[] | void> {
    const res = [];
    let cur: any;
    while (!this.env.interrupted && res.length < n && (cur = await this.read()) !== null)
      res.push(cur);
    return res.length === 0 ? null : res;
  }
};

/** Execution environment */
export class PipeEnv extends ExecEnv<Pipe> {
  constructor(terminal: Terminal, opts: ExecEnvOptions<Pipe> = {}) {
    super(terminal, opts);
  }

  /** Receive input from stdin if non-null or args. */
  async argsOrStdin(
    stdin?: Reader<Pipe>,
    args?: any,
    opts = argOptions as ArgOptions,
  ) {
    opts = deepMerge(opts, argOptions);
    let res = args ? (Array.isArray(args) ? args : args.split(opts.sep)) : [];
    if (res?.length >= opts.requiredArgs && !opts.readAll)
      return res;

    if (stdin) {
      const sep = opts.splitStdin
        ? isString(opts.splitStdin) ? opts.splitStdin : opts.sep
        : undefined;

      if (opts.readAll) {
        let data = await stdin.readAll();
        if (data) {
          if (!Array.isArray(data))
            data = [data];
          res = res.concat(sep ? data
            .map(el => el?.split(sep))
            .filter(el => el?.length > 0)
            : data);
        }
      } else {
        let nread = opts.requiredArgs - res.length;
        while (nread > 0 && !(this.interrupted || stdin.isClosed())) {
          try {
            let data = await stdin.read();
            if (data) {
              res.push(sep ? data.split(sep) : data);
              --nread;
            }
          } catch (error) {
            break;
          }
        }
      }
    }

    if (res.length < opts.requiredArgs)
      throw new Error(
        `${opts.name} missing ${opts.requiredArgs - res.length} arguments`
      );

    return opts.flatten ? flatten(res) : res;
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
