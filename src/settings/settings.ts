import { getUserConfig, updateUserConfig } from '~config';
import { Debug } from '~utils';
const debug = Debug('settings');

document.addEventListener('DOMContentLoaded', async function () {
  const form = document.getElementById('settings-form');

  const config = await getUserConfig();
  debug('current: %O', config);
  const debugPrefix = document.getElementById('debugPrefix') as HTMLInputElement;
  const openShell = document.getElementById('openShell') as HTMLInputElement;
  const toggleFullscreen = document.getElementById('toggleFullscreen') as HTMLInputElement;
  const shellHeight = document.getElementById('shellHeight') as HTMLInputElement;
  debugPrefix.value = config.debugPrefix;
  shellHeight.value = config.shellHeight;
  openShell.value = config.commands.openShell;
  toggleFullscreen.value = config.commands.toggleFullscreen;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    config.debugPrefix = debugPrefix.value;
    config.shellHeight = shellHeight.value;
    config.commands.openShell = openShell.value;
    toggleFullscreen.value = config.commands.toggleFullscreen;

    await updateUserConfig(config);
    debug('saved: %O', config)
    alert('Settings saved!');
  });
});
