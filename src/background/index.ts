import { BackgroundPage } from './background';
// import { Debug } from '~utils';
// const debug = Debug('bg');

// expose storage.session to content scripts
chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })

async function openAppPage() {
  const tabs = await chrome.tabs.query({});
  const url = chrome.runtime.getURL('app.html');
  const tab = tabs.find((tab) => tab.url?.startsWith(url));
  if (tab) {
    await chrome.tabs.update(tab.id, { active: true });
  } else {
    // const {  } = await
  }
}

// chrome.action.onClicked.addListener(() => {
//   debug('openAppPage');
//   openAppPage();
// });

// chrome.commands.onCommand.addListener(async (command) => {
//   debug('Command: %s', command);
//   if (command === 'open-shell') {
//     openAppPage()
//   }
// });

// chrome.runtime.onInstalled.addListener((details) => {
//   if (details.reason === 'install') {
//     chrome.tabs.create({ url: 'app.html#/setting' });
//   }
// });

export var bgPage = new BackgroundPage()

// chrome.webNavigation.onDOMContentLoaded.addListener(async ({ tabId, url }) => {
//   const { options } = await chrome.storage.local.get('options');
//   chrome.scripting.executeScript({
//     target: tabId,
//     files: ['content.js'],
//     ...options
//   });
// });

