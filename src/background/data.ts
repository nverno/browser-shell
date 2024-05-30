import { fileSave, fileOpen } from 'browser-fs-access';

export async function exportData() {
  const [syncData, localData] = await Promise.all([
    chrome.storage.sync.get(null),
    chrome.storage.local.get(null)
  ]);
  const data = {
    sync: syncData,
    local: localData,
    localStorage: { ...localStorage },
  };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  await fileSave(blob, { fileName: 'browser-shell.json' });
}

export async function importData() {
  const blob = await fileOpen({ extensions: ['.json'] })
  const json = JSON.parse(await blob.text())
  if (!json.sync || !json.local) {
    throw new Error('Invalid data')
  }
  if (!window.confirm(
    'Are you sure you want to import data? This will overwrite your current data'
  )) {
    return
  }
  await chrome.storage.local.clear()
  await chrome.storage.local.set(json.local)
  await chrome.storage.sync.clear()
  await chrome.storage.sync.set(json.sync)

  if (json.localStorage) {
    for (const [k, v] of Object.entries(json.localStorage as Record<string, string>)) {
      localStorage.setItem(k, v)
    }
  }

  alert('Imported data successfully')
  location.reload()
}
