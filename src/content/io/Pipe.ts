import { Debug } from '~utils';
import { sendSigPipe } from './SigPipe';
import { Reader, Writer } from './Io';
const debug = Debug('io:pipe');

export abstract class PipeBase<T = any> {
  name: string;
  numWriter = 0;
  numReader = 0;
  readClosed = false;
  writeClosed = false;
  closeReadCallbacks: (() => void)[] = [];
  closeWriteCallbacks: (() => void)[] = [];

  constructor(name: string) {
    this.name = name;
  }
  abstract read(args?: any): Promise<T | void>;
  abstract readAll(args?: any): Promise<T[]>;
  abstract write(data: T): void;

  log(fmt = "%s", ...args: any[]) {
    debug(`#<${this.name}> ${fmt}`, args)
  }

  /** Split pipe into read/write streams. */
  split() {
    return [this.openReader(), this.openWriter()];
  }
  /** Open new pipe reader */
  openReader() {
    return new Reader<typeof this>(this);
  }
  /** Open new pipe writer */
  openWriter() {
    return new Writer<typeof this>(this);
  }

  /** Close pipe writer */
  closeWrite() {
    if (this.numWriter === 0) {
      return true;
      // throw new Error(`pipe already write-closed '${this.name}'`);
    }
    if (--this.numWriter === 0) {
      this.writeClosed = true;
      this.log('CLOSE write');
      this.closeWriteCallbacks.forEach(fn => fn());
      return true;
    }
    return false;
  }

  /** Add callback to be called when pipe's write end is closed. */
  onCloseWrite(callback: () => void) {
    if (this.writeClosed) {
      callback();
    } else {
      this.closeWriteCallbacks.push(callback);
    }
  }

  /** Close pipe reader. */
  closeRead() {
    if (this.numReader === 0) {
      return true;
      // throw new Error(`pipe already read-closed '${this.name}'`);
    }
    if (--this.numReader === 0) {
      this.log('CLOSE read');
      this.readClosed = true;
      this.closeReadCallbacks.forEach(fn => fn());
      return true;
    }
    return false;
  }

  /** Add callback to be called when pipe's read end is closed. */
  onCloseRead(callback: () => void) {
    if (this.readClosed) {
      callback();
    } else {
      this.closeReadCallbacks.push(callback);
    }
  }

  /** Return true if pipe has at least one reader. */
  hasReader() {
    return this.numReader > 0;
  }
  /** Return true if pipe has at least one writer. */
  hasWriter() {
    return this.numWriter > 0;
  }
};

export class Pipe<T = any> extends PipeBase<T> {
  buffer: T[] = [];
  readers: ((value?: T) => void)[] = [];

  constructor(name: string) {
    super(name);
    super.log('CREATE');
  }

  write(value: T): void {
    if (this.readClosed) {
      sendSigPipe(`pipe is read-closed '${this.name}`);
      throw new Error(`SIGPIPE - pipe is read-closed '${this.name}'`);
    }
    if (this.readers.length > 0) {
      const reader = this.readers.shift()!;
      reader(value);
    } else {
      this.buffer.push(value);
    }
  }

  async read(): Promise<T | void> {
    return new Promise((resolve, _reject) => {
      if (this.buffer.length > 0) {
        resolve(this.buffer.shift()!);
      } else if (this.writeClosed) {
        this.closeRead();
        resolve(null);
      } else {
        this.readers.push(resolve);
      }
    });
  }

  async readAll(): Promise<T[]> {
    const res = [];
    let cur: any;
    while ((cur = await this.read()) != null)
      res.push(cur);
    return res;
  }

  closeWrite() {
    if (!super.closeWrite())
      return false;

    while (this.readers.length > 0) {
      const reader = this.readers.shift()!;
      reader(this.buffer.shift() || null);
    }
    return true;
  }

  closeRead() {
    if (!super.closeRead())
      return false

    while (this.readers.length > 0) {
      const reader = this.readers.shift()!;
      reader(null);
    }
    return true;
  }
};
