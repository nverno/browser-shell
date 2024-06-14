import { PipeBase } from './Pipe';
import { sendSigPipe } from './SigPipe';
import { Debug } from '~utils';
const debug = Debug('stream');

export class Stream<T = any> extends PipeBase<T> {
  readCallback?: (data: T, readyForMore: () => void) => void;
  onReadCallback?: () => void;

  constructor(name: string) {
    super(name);
    debug('created %s', name);
  }

  write(data: T, readyForMore: () => void = () => {}) {
    if (this.writeClosed) {
      throw new Error(`Cannot write to write-closed stream '${this.name}'`);
    }
    if (this.readClosed) {
      sendSigPipe(`${this.name} is closed for read`);
      throw new Error(`cannot write to read-closed stream '${this.name}'`);
    }
    if (!this.readCallback) {
      throw new Error(`Cannot write to stream not opened for read '${this.name}'`);
    }
    this.readCallback(data, readyForMore);
  }
  
  onRead(callback: () => void) {
    this.numWriter++;
    if (this.onReadCallback) {
      throw new Error(`onRead callback already defined '${this.name}'`);
    }
    this.onReadCallback = callback;
    if (this.readCallback) {
      this.onReadCallback();
    }
  }

  read(callback: (data: T, readyForMore: () => void) => void) {
    this.numReader++;
    if (this.readCallback) {
      throw new Error(`read callback already defined '${this.name}'`);
    }
    this.readCallback = callback;
    this.onReadCallback?.();
  }

  readAll(callback: (fullData: T[]) => void) {
    const fullData: T[] = [];
    this.read((data: T, readyForMore: () => void) => {
      fullData.push(data);
      readyForMore();
    });
    this.onCloseWrite(() => callback(fullData));
  }
}
