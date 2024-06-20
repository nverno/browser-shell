import { Debug } from '~utils';
const debug = Debug('settings');

// Watch for changes to the user's options & apply them
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
      debug("Storage key='%s' in namespace='%s' changed", key, area);
      debug("Old value='%o', new value='%o'", oldValue, newValue);
    }
  }
});

