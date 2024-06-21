import { getUserConfig } from '~config';
import { IMessage } from '~utils';
import { Debug } from '~utils';
const debug = Debug('history');

export interface CommandHistory {
  command: string;
  output: any;
  timestamp?: string;
}
export interface HistoryRequest extends IMessage {
  payload: {} | CommandHistory;
}

chrome.runtime.onInstalled.addListener(() => {
  debug('init commandHistory');
  chrome.storage.local.get("commandHistory", (data) => {
    if (!data.commandHistory)
      chrome.storage.local.set({ commandHistory: [] });
  });
});

async function pruneHistory(time?: string) {
  if (!time) {
    await chrome.storage.local.set({ commandHistory: [] });
    debug('cleared history');
  }
  // TODO(6/15/24): prune history
}

async function historyPush(command: CommandHistory) {
  command.timestamp ||= new Date().toISOString();
  const { commandHistory } = await chrome.storage.local.get({
    commandHistory: []
  });
  commandHistory.push(command);
  await chrome.storage.local.set({ commandHistory });
}

async function getHistory(): Promise<CommandHistory[]> {
  const { commandHistory = [] } = await chrome.storage.local.get({
    commandHistory: [],
  });
  return commandHistory;
}

chrome.runtime.onStartup.addListener(async () => {
  // FIXME: where should this go
  const config = await getUserConfig();
  const histMaxSize = config.history.maxSize;
  const hist = await getHistory();
  debug('startup: histMaxSize=%d, memory: %O', histMaxSize, hist);
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  for (const [key, { oldValue: _o, newValue: _n }] of Object.entries(changes)) {
    debug("Storage key='%s' in namespace='%s' changed", key, namespace);
    // debug("Old value='%o', new value='%o'", oldValue, newValue);
  }
});

chrome.runtime.onMessage.addListener(
  (request: HistoryRequest, sender, sendResponse: any) => {
    if (request.target !== 'history')
      return;
    debug("received from %s (%s): %j",
      sender.tab?.url, sender.tab?.incognito && 'incognito', request);

    const handler = async () => {
      switch (request.command) {
        case 'getHistory':
          const history = await getHistory();
          return { history };

        case 'addCommand':
          const command = request.payload as CommandHistory;
          historyPush(command);
          return;

        case 'clearHistory':
          return pruneHistory();

        default:
          return { errors: [
            new Error(`history unknown command: ${request.command}`),
          ]};
      }
    };
    handler()
      .then(res => sendResponse(res))
      .catch(errors => sendResponse({ errors }));

    return true;
  }
);
