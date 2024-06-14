import { Debug } from '~utils';
import { sendSigPipe } from './SigPipe';
const debug = Debug('pipe');

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
  
  abstract read(args?: any): Promise<T | void> | void;
  abstract write(data: T): void;

  log(fmt = "%s", ...args: any[]) {
    debug(`#<${this.name}> ${fmt}`, args)
  }

  closeWrite() {
    if (this.numWriter === 0) {
      throw new Error(`pipe already write-closed '${this.name}'`);
    }
    if (--this.numWriter === 0) {
      this.writeClosed = true;
      this.log('write closed');
      this.closeWriteCallbacks.forEach(fn => fn());
      return true;
    }
    return false;
  }

  onCloseWrite(callback: () => void) {
    if (this.writeClosed) {
      callback();
    } else {
      this.closeWriteCallbacks.push(callback);
    }
  }

  closeRead() {
    if (this.numReader === 0) {
      return true;
      // throw new Error(`pipe already read-closed '${this.name}'`);
    }
    if (--this.numReader === 0) {
      this.readClosed = true;
      this.log('read closed');
      this.closeReadCallbacks.forEach(fn => fn());
      return true;
    }
    return false;
  }

  onCloseRead(callback: () => void) {
    if (this.readClosed) {
      callback();
    } else {
      this.closeReadCallbacks.push(callback);
    }
  }

  hasReader() {
    return this.numReader > 0; 
  }
  hasWriter() {
    return this.numWriter > 0;
  }
};

export class Pipe<T = any> extends PipeBase<T> {
  buffer: T[] = [];
  readers: ((value?: T) => void)[] = [];
  writeClosed = false;
  readClosed = false;

  constructor(name: string) {
    super(name);
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

  read(): Promise<T | void> {
    return new Promise((resolve, reject) => {
      if (this.buffer.length > 0) {
        resolve(this.buffer.shift()!);
      } else if (this.writeClosed) {
        reject(new Error(`pipe is write-closed '${this.name}'`));
      } else {
        this.readers.push(resolve);
      }
    });
  }

  closeWrite() {
    if (!super.closeWrite())
      return false;
    while (this.readers.length > 0) {
      const reader = this.readers.shift()!;
      reader(this.buffer.shift());
    }
    return true;
  }

  closeRead() {
    if (!super.closeRead()) return false
    while (this.readers.length > 0) {
      const reader = this.readers.shift()!;
      reader();
    }
    return true;
  }
};

// let randomIntArray = (min, max, n = 1) => Array
//   .from({ length: n }, () => Math.floor(Math.random() * (max - min + 1)) + min);

// Example usage:
// let pipe = new Pipe<number>();

// Writer
// let times = randomIntArray(1000, 10000, 3);
// times.sort((a, b) => a - b);
// for (let [i, ms] of times.entries()) {
//   setTimeout(() => {
//     pipe.write(i)
//   }, ms);
// }
// setTimeout(() => pipe.close(), times[times.length - 1] + 500);

// Reader
// (async () => {
//   try {
//     console.log(await pipe.read()); // 1
//     console.log(await pipe.read()); // 2
//     console.log(await pipe.read()); // 3
//   } catch (error) {
//     console.error(error.message);
//   }
// })();
