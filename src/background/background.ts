import { Debug, isNumber } from '~utils';
const debug = Debug('background');

interface IRequest {
  command: string;
  payload: any;
};

async function getCurrentTab(opts = { active: true, lastFocusedWindow: true }) {
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

function maybeOpen(id) {
  var openWhenComplete = [];
  try {
    openWhenComplete = JSON.parse(localStorage.openWhenComplete);
  } catch (e) {
    localStorage.openWhenComplete = JSON.stringify(openWhenComplete);
  }
  var openNowIndex = openWhenComplete.indexOf(id);
  if (openNowIndex >= 0) {
    chrome.downloads.open(id);
    openWhenComplete.splice(openNowIndex, 1);
    localStorage.openWhenComplete = JSON.stringify(openWhenComplete);
  }
}

function openWhenComplete(downloadId) {
  var ids = [];
  try {
    ids = JSON.parse(localStorage.openWhenComplete);
  } catch (e) {
    localStorage.openWhenComplete = JSON.stringify(ids);
  }
  if (ids.indexOf(downloadId) >= 0) {
    return;
  }
  ids.push(downloadId);
  localStorage.openWhenComplete = JSON.stringify(ids);
}



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

        const handler = async () => {
          switch (request.command) {
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
                })
                .catch(errors => sendResponse({ errors }));
              break;

            case 'insertCSS':
              chrome.scripting.insertCSS({
                target: { tabId: sender.tab.id },
                ...request.payload
              }).then(() => sendResponse())
                .catch(errors => sendResponse({ errors }));;
              break;

            case 'removeCSS':
              chrome.scripting.removeCSS({
                target: { tabId: sender.tab.id },
                ...request.payload,
              }).then(() => sendResponse())
                .catch(errors => sendResponse({ errors }));
              break;

            case 'executeScript':
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
              break;

            case 'unregisterScripts':
              unregisterContentScripts(...request.payload)
                .then(() => sendResponse({}))
                .catch(errors => sendResponse({ errors }));
              break;

            case 'download':
              chrome.downloads.download({
                conflictAction: 'uniquify',
                ...request.payload
              })
                .then((id) => {
                  if (isNumber(id))
                    openWhenComplete(id);
                  sendResponse(id);
                })
                .catch(errors => sendResponse({ errors }));
              break;

            default:
              sendResponse({ errors: `unknown command: ${request.command}` });
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
