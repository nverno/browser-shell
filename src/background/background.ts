import { Debug, isNumber, IMessage } from '~utils';
import { openWhenComplete } from './downloads';
const debug = Debug('bg');

export async function getCurrentTab(opts = { active: true, lastFocusedWindow: true }) {
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  const [tab] = await chrome.tabs.query(opts);
  return tab;
}

async function unregisterContentScripts(
  filter?: chrome.scripting.ContentScriptFilter
) {
  try {
    if (!filter) {
      const scripts = await chrome.scripting.getRegisteredContentScripts();
      filter = { ids: scripts.map(script => script.id) };
    }
    return chrome.scripting.unregisterContentScripts(filter);
  } catch (error) {
    throw new Error(
      "An unexpected error occurred while unregistering dynamic content scripts.",
      { cause: error }
    );
  }
}

// const STORED_KEYS: string[] = ['commands'];

export class BackgroundPage {
  // memory: { [key: string]: any } = STORED_KEYS.reduce(
  //   (acc, k) => ({ [k]: undefined, ...acc }), {}
  // );

  constructor() {
    this.listen();
    // addEventListener('activate', (_e) => this.updateMemory());
    // debug('Memory: %O', this.memory);
  }

  // updateMemory() {
  //   chrome.storage.local.get(STORED_KEYS).then((items) => {
  //     for (const key of STORED_KEYS) {
  //       if (key in items)
  //         this.memory[key] = items[key];
  //     }
  //   });
  // }

  listen() {
    chrome.runtime.onMessage.addListener(
      (request: IMessage, sender, sendResponse: any) => {
        if (request.target !== 'background') return;
        debug("Remote received from %s (%s): %j",
          sender.tab?.url, sender.tab?.incognito && 'incognito', request);

        const handler = async () => {
          switch (request.command) {
            case 'listCommands':
              return [
                'listCommands',
                'insertCSS', 'removeCSS',
                'executeScript', 'unregisterScripts',
                'download', 'openTab',
              ];

            case 'insertCSS': {
              const { payload: { target, ...opts } } = request
              return chrome.scripting.insertCSS({
                target: { tabId: sender.tab.id, ...target },
                ...opts
              });
            }

            case 'removeCSS': {
              const { payload: { target, ...opts } } = request
              return chrome.scripting.removeCSS({
                target: { tabId: sender.tab.id, ...target },
                ...opts,
              });
            }

            case 'executeScript': {
              const { payload: { target, ...opts } } = request
              return chrome.scripting
                .executeScript({
                  target: { tabId: sender.tab.id, ...target },
                  ...opts,
                });
              // .then(injectionResults => {
              //   for (const frameResult of injectionResults) {
              //     const { frameId, result } = frameResult;
              //     debug(`Frame ${frameId} result: %O`, result);
              //   }
              //   sendResponse({ result: injectionResults })
            }

            case 'unregisterScripts':
              return unregisterContentScripts(request.payload);

            case 'openTab':
              throw new Error('unimplemented');

            case 'download':
              return chrome.downloads
                .download({
                  conflictAction: 'uniquify',
                  ...request.payload
                } as chrome.downloads.DownloadOptions)
                .then((id) => {
                  if (isNumber(id)) openWhenComplete(id);
                  sendResponse(id);
                });

            default:
              return { errors: [
                new Error(`background unknown command: ${request.command}`),
              ]};
              // throw new Error(`unknown command: ${request.command}`);
          }
        };
        handler()
          .then(res => sendResponse(res))
          .catch(errors => sendResponse({ errors }));

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
