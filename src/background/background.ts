import { Debug } from '~utils';
const debug = Debug('background');

interface IRequest {
  command: string;
  payload: any;
};

export class BackgroundPage {
  STORED_KEYS: string[] = ['commands'];
  memory: { [key: string]: any } = this.STORED_KEYS.reduce(
    (acc, k) => ({ [k]: undefined, ...acc }), {}
  );

  constructor() {
    this.listen();
    addEventListener('activate', (_e) => this.updateMemory());
    debug('Memory: %O', this.memory);
  }

  updateMemory() {
    chrome.storage.local.get(this.STORED_KEYS).then((items) => {
      for (const key of this.STORED_KEYS) {
        if (key in items)
          this.memory[key] = items[key];
      }
    });
  }

  setStorage(variables: { [key: string]: any }) {
    for (const [key, val] of Object.entries(variables)) {
      this.memory[key] = val;
    }
    return chrome.storage.local.set(variables);
  }

  listen() {
    chrome.runtime.onMessage.addListener(
      (request: IRequest, sender, sendResponse: any) => {

        debug("Remote received from %s (%s): %j",
          sender.tab?.url, sender.tab?.incognito && 'incognito', request);

        const handler = () => {
          switch (request.command) {
            // case 'copy':
            //   putInClipboard(request.payload.text);
            //   sendResponse();
            //   break;

            // case 'paste':
            //   sendResponse({ text: getFromClipboard() });
            //   break;

            // case 'compile':
            //   debug('compile: unimplemented');
            //   break;

            case 'getHistory':
              sendResponse({ commands: this.memory.commands || [] });
              break;

            case 'recordCommand':
              this.updateMemory();
              this.memory.commands ||= [];
              this.memory.commands.unshift(request.payload);
              this.memory.commands = this.memory.commands.slice(0, 51);

              chrome.storage.local
                .set({ commands: this.memory.commands })
                .then((res) => {
                  debug('recorded: %o', res);
                  sendResponse();
                });
              break;

            default:
              sendResponse({ errors: "unknown command" });
              break;
          }
        };
        setTimeout(handler, 10);

        // Return true to indicate async message passing:
        // http://developer.chrome.com/extensions/runtime#event-onMessage
        return true;
      });
  }

  errorResponse(callback: (response: { errors: string[] }) => void, message: string) {
    debug(message);
    callback({ errors: [message] });
  }
};
