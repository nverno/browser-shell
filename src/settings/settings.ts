import { getUserConfig, updateUserConfig } from '~config';
import { Debug } from '~utils';
const debug = Debug('settings');

document.addEventListener('DOMContentLoaded', async function() {
  const form = document.getElementById('settings-form');

  const config = await getUserConfig();
  debug('current: %O', config);
  const debugPrefix = document.getElementById('debugPrefix') as HTMLInputElement;
  const openShell = document.getElementById('openShell') as HTMLInputElement;
  debugPrefix.value= config.debugPrefix;
  openShell.value = config.commands.openShell;
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    config.debugPrefix = debugPrefix.value;
    config.commands.openShell = openShell.value;

    await updateUserConfig(config);
    debug('saved: %O', config)
    alert('Settings saved!');
  });
});
