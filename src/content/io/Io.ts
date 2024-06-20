import { PipeBase } from './Pipe';
import { Debug } from '~utils';
const debug = Debug('io');

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
    debug(`new ${stream.name}::Reader(${stream.numReader},${stream.numWriter})`);
  }
  read(): Promise<T | void> | void {
    return this.stream.read();
  }
  async readAll(): Promise<T[] | void> {
    return this.stream.readAll();
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
    debug(`new ${stream.name}::Writer(${stream.numReader},${stream.numWriter})`);
  }
  write(data: T) {
    this.stream.write(data);
  }
  close() {
    return this.stream.closeWrite();
  }
  onClose(callback: () => void) {
    this.stream.closeWriteCallbacks.push(callback);
  }
}
