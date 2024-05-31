import { Debug } from '~utils';
const debug = Debug('stream');

export class Stream<T = any> {
  name: string;
  senderClosed = false;
  receiverClosed = false;
  receiveCallback?: (data: T, readyForMore: () => void) => void;
  onSenderCloseCallback?: () => void;
  onReceiverCloseCallback?: () => void;
  onReceiverCallback?: () => void;

  constructor(name: string) {
    this.name = name;
  }

  log(fmt = "%s", ...args: any[]) {
    debug(`#<${this.name}> ${fmt}`, args)
  }

  senderClose() {
    if (this.senderClosed) {
      throw new Error(`Cannot sender-close already sender-closed stream '${this.name}'`);
    }
    if (!this.receiveCallback) {
      throw new Error(`Cannot close stream not opened for read '${this.name}'`);
    }
    this.log("received senderClose");
    this.senderClosed = true;
    this.onSenderCloseCallback?.();
  }

  receiverClose() {
    if (this.receiverClosed) {
      throw new Error(`Cannot receiver-close already receiver-closed stream '${this.name}'`);
    }
    if (!this.receiveCallback) {
      throw new Error(`Cannot close stream not opened for read '${this.name}'`);
    }
    this.log("received receiverClose");
    this.receiverClosed = true;
    this.onReceiverCloseCallback?.();
  }

  onSenderClose(callback: () => void) {
    if (this.onSenderCloseCallback) {
      throw new Error(`Cannot bind more than one sender-close callback to '${this.name}'`);
    }
    this.onSenderCloseCallback = callback;
    if (this.senderClosed) {
      this.onSenderCloseCallback?.();
    }
  }

  onReceiverClose(callback: () => void) {
    if (this.onReceiverCloseCallback) {
      throw new Error(`Cannot bind more than one receiver-close callback to '${this.name}'`);
    }
    this.onReceiverCloseCallback = callback;
    if (this.receiverClosed) {
      this.onReceiverCloseCallback?.();
    }
  }

  onReceiver(callback: () => void) {
    if (this.onReceiverCallback) {
      throw new Error(`Cannot bind more than one receiver callback to '${this.name}'`);
    }
    this.onReceiverCallback = callback;
    if (this.receiveCallback) {
      this.onReceiverCallback?.();
    }
  }

  hasReceiver(): boolean {
    return !!this.onReceiverCallback;
  }

  send(data: T, readyForMore: () => void = () => {}) {
    if (this.senderClosed) {
      throw new Error(`Cannot write to sender-closed stream '${this.name}'`);
    }
    if (!this.receiveCallback) {
      throw new Error(`Cannot write to stream not opened for read '${this.name}'`);
    }
    if (this.receiverClosed) {
      throw new Error(`Cannot write to receiver-closed stream '${this.name}'`);
    }
    // this.log(`sent: %O`, data);
    this.receiveCallback(data, readyForMore);
  }

  receive(callback: (data: T, readyForMore: () => void) => void) {
    if (this.receiveCallback) {
      throw new Error(`Cannot bind more than one receive callback to '${this.name}'`);
    }
    this.receiveCallback = callback;
    this.onReceiverCallback?.();
  }

  receiveAll(callback: (fullData: T[]) => void) {
    const fullData: T[] = [];
    this.receive((data: T, readyForMore: () => void) => {
      fullData.push(data);
      readyForMore();
    });
    this.onSenderClose(() => callback(fullData));
  }
}
