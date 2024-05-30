import { Debug, isNumber, IMessage } from '~utils';
import { openWhenComplete } from './downloads';
const debug = Debug('bg');

export async function getCurrentTab(opts = { active: true, lastFocusedWindow: true }) {
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  let [tab] = await chrome.tabs.query(opts);
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

const STORED_KEYS: string[] = ['commands'];

export class BackgroundPage {
  memory: { [key: string]: any } = STORED_KEYS.reduce(
    (acc, k) => ({ [k]: undefined, ...acc }), {}
  );

  constructor() {
    this.listen();
    addEventListener('activate', (_e) => this.updateMemory());
    debug('Memory: %O', this.memory);
  }

  updateMemory() {
    chrome.storage.local.get(STORED_KEYS).then((items) => {
      for (const key of STORED_KEYS) {
        if (key in items)
          this.memory[key] = items[key];
      }
    });
  }

  listen() {
    chrome.runtime.onMessage.addListener(
      (request: IMessage, sender, sendResponse: any) => {
        if (request.target !== 'background') return;
        debug("Remote received from %s (%s): %j",
          sender.tab?.url, sender.tab?.incognito && 'incognito', request);

        const handler = async () => {
          switch (request.command) {
            case 'echo':
              debug('%j', request);
              sendResponse();
              break;

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
                .then(() => sendResponse())
                .catch(errors => sendResponse({ errors }));
              break;

            case 'insertCSS': {
              const { payload: { target, ...opts } } = request
              chrome.scripting.insertCSS({
                target: { tabId: sender.tab.id, ...target },
                ...opts
              }).then(() => sendResponse())
                .catch(errors => sendResponse({ errors }));;
            }
              break;

            case 'removeCSS': {
              const { payload: { target, ...opts } } = request
              chrome.scripting.removeCSS({
                target: { tabId: sender.tab.id, ...target },
                ...opts,
              }).then(() => sendResponse())
                .catch(errors => sendResponse({ errors }));
            }
              break;

            case 'executeScript': {
              const { payload: { target, ...opts } } = request
              chrome.scripting
                .executeScript({
                  target: { tabId: sender.tab.id, ...target },
                  ...opts,
                })
                .then(injectionResults => {
                  for (const frameResult of injectionResults) {
                    const { frameId, result } = frameResult;
                    debug(`Frame ${frameId} result: %O`, result);
                  }
                  sendResponse({ result: injectionResults })
                })
                .catch(errors => sendResponse({ errors }));
            }
              break;

            case 'unregisterScripts':
              unregisterContentScripts(request.payload)
                .then(() => sendResponse({}))
                .catch(errors => sendResponse({ errors }));
              break;

            case 'openTab':
              
              break;
            case 'download':
              chrome.downloads
                .download({
                  conflictAction: 'uniquify',
                  ...request.payload
                } as chrome.downloads.DownloadOptions)
                .then((id) => {
                  if (isNumber(id)) openWhenComplete(id);
                  sendResponse(id);
                })
                .catch(errors => sendResponse({ errors }));
              break;

            default:
              sendResponse({ errors: `unknown command: ${request.command}` });
          }
        };
        handler();
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
