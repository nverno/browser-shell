import { getUserConfig, updateUserConfig } from '~config';
import { Debug } from '~utils';
const debug = Debug('settings');


document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('options') as any;
  const config = await getUserConfig();
  debug('current: %O', config);

  const debugPrefix = document.getElementById('debugPrefix') as HTMLInputElement;
  const debugStorage = document.getElementById('debugStorage') as HTMLInputElement;
  const openShell = document.getElementById('openShell') as HTMLInputElement;
  const toggleFullscreen = document.getElementById('toggleFullscreen') as HTMLInputElement;
  const shellHeight = document.getElementById('shellHeight') as HTMLInputElement;

  debugPrefix.value = config.debug.prefix;
  debugStorage.checked = Boolean(config.debug.storage);
  shellHeight.value = config.shell.height;
  openShell.value = config.commands.openShell;
  toggleFullscreen.value = config.commands.toggleFullscreen;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    config.debug.prefix = debugPrefix.value;
    config.debug.storage = debugStorage.checked;
    config.shell.height = shellHeight.value;
    config.commands.openShell = openShell.value;
    toggleFullscreen.value = config.commands.toggleFullscreen;

    await updateUserConfig(config);
    debug('saved: %O', config);
    alert('Settings saved!');
  });

  // Immediately persist changes
  form.debugStorage.addEventListener("change", (event) => {
    config.debug.storage = event.target.checked;
    updateUserConfig(config);
    // chrome.storage.sync.set({ config });
  });

  // Initialize the form with the user's option settings
  // const data = await chrome.storage.sync.get("options");
  // Object.assign(options, data.options);
  // optionsForm.debug.checked = Boolean(options.debug);
});


