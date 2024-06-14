import { PipeBase } from './Pipe';

export abstract class IoBase<S extends PipeBase> {
  stream: S;
  openForRead = false;
  openForWrite = false;
  constructor(stream: S) {
    this.stream = stream;
  }
};

export class Reader<S extends PipeBase, T = any> extends IoBase<S> {
  numReaders = 0;
  closeReadCallbacks: (() => void)[] = [];

  constructor(stream: S) {
    super(stream);
    this.openForRead = true;
  }
  read(): Promise<T | void> | void {
    return this.stream.read();
  }
  close() {
    if (--this.numReaders === 0) {
      this.stream.closeRead();
    }
  }
  onClose(callback: () => void) {
    this.stream.closeReadCallbacks.push(callback);
  }
};

export class Writer<S extends PipeBase, T = any> extends IoBase<S> {
  closeWriteCallbacks: (() => void)[] = [];
  constructor(stream: S) {
    super(stream);
    this.openForRead = true;
    this.closeWriteCallbacks = [];
  }
  write(data: T) {
    this.stream.write(data);
  }
  close() {
    this.stream.closeWrite();
  }
  onClose(callback: () => void) {
    this.stream.closeWriteCallbacks.push(callback);
  }
}
