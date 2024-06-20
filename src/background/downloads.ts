

export function maybeOpen(id) {
  let openWhenComplete = [];
  try {
    openWhenComplete = JSON.parse(localStorage.openWhenComplete);
  } catch (e) {
    localStorage.openWhenComplete = JSON.stringify(openWhenComplete);
  }
  const openNowIndex = openWhenComplete.indexOf(id);
  if (openNowIndex >= 0) {
    chrome.downloads.open(id);
    openWhenComplete.splice(openNowIndex, 1);
    localStorage.openWhenComplete = JSON.stringify(openWhenComplete);
  }
}

export function openWhenComplete(downloadId) {
  let ids = [];
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

