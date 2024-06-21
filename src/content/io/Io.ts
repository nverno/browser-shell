import { PipeBase } from './Pipe';


export abstract class IoBase<S extends PipeBase> {
  stream: S;
  constructor(stream: S) {
    this.stream = stream;
  }
};

export class Reader<S extends PipeBase, T = any> extends IoBase<S> {
  constructor(stream: S) {
    stream.numReader++;
    super(stream);
    stream.log(`OPEN read (r=${stream.numReader},w=${stream.numWriter})`);
  }
  async read(): Promise<T | void> {
    return this.stream.read();
  }
  async readAll(): Promise<T[]> {
    return this.stream.readAll();
  }
  isClosed() {
    return this.stream.readClosed;
  }
  close() {
    return this.stream.closeRead();
  }
  onClose(callback: () => void) {
    this.stream.closeReadCallbacks.push(callback);
  }
};

export class Writer<S extends PipeBase, T = any> extends IoBase<S> {
  constructor(stream: S) {
    stream.numWriter++;
    super(stream);
    stream.log(`OPEN write (r=${stream.numReader},w=${stream.numWriter})`);
  }
  write(data: T) {
    this.stream.write(data);
  }
  isClosed() {
    return this.stream.writeClosed || this.stream.readClosed;
  }
  close() {
    return this.stream.closeWrite();
  }
  onClose(callback: () => void) {
    this.stream.closeWriteCallbacks.push(callback);
  }
}
