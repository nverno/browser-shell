import { deepMerge } from '~utils';

const userConfigDefault = {
  debug: {
    prefix: 'bs:*',
    storage: true,
  },
  shell: {
    height: '400px',
  },
  server: {
    port: 5005,
  },
  commands: {
    openShell: 'C-z',
    clearShell: 'M-C-k',
    toggleFullscreen: 'M-l',
  },
  history: {
    maxSize: 100,
  },
};

export type UserConfig = typeof userConfigDefault;

export async function getUserConfig(): Promise<UserConfig> {
  const config = await chrome.storage.sync.get(
    Object.keys(userConfigDefault)
  );
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
