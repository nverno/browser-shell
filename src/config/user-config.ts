import { defaultsDeep } from 'lodash';

let userConfigDefault = {
  debugPrefix: 'bs:*',
  commands: {
    openShell: 'C-z',
  }
};

export type UserConfig = typeof userConfigDefault;

export async function getUserConfig(): Promise<UserConfig> {
  const config = await chrome.storage.sync.get(Object.keys(userConfigDefault));
  return defaultsDeep(config, userConfigDefault);
}

export async function updateUserConfig(updates: Partial<UserConfig>) {
  await chrome.storage.sync.set(updates);
  for (const [key, val] of Object.entries(updates)) {
    if (val === undefined) {
      await chrome.storage.sync.remove(key);
    }
  }
}
