import { deepMerge } from '~utils';

let userConfigDefault = {
  debugPrefix: 'bs:*',
  shellHeight: '400px',
  // serverPort: 5005,
  commands: {
    openShell: 'C-z',
    toggleFullscreen: 'M-l',
  }
};

export type UserConfig = typeof userConfigDefault;

export async function getUserConfig(): Promise<UserConfig> {
  const config = await chrome.storage.sync.get(Object.keys(userConfigDefault));
  return deepMerge(config, userConfigDefault);
}

export async function updateUserConfig(updates: Partial<UserConfig>) {
  await chrome.storage.sync.set(updates);
  for (const [key, val] of Object.entries(updates)) {
    if (val === undefined) {
      await chrome.storage.sync.remove(key);
    }
  }
}
