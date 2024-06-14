import { Debug } from '~utils';
const debug = Debug('signal');

export class SigPipe<T = any> extends Event {
  constructor(public detail: T) {
    super("sigPipe");
  }
}
export interface SignalData {
  message?: string;
  timestamp: number;
}

export function sendSigPipe(message?: string) {
  debug("sending sigPipe: %s", message);
  const signal = new SigPipe({
    message,
    timestamp: Date.now(),
  });
  window.dispatchEvent(signal);
}

export function sigPipeListen() {
  window.addEventListener("sigPipe", (event: Event) => {
    const sigpipe = event as SigPipe<SignalData>;
    debug("Received SIGPIPE: %s", sigpipe.detail);
  });
}

