import { BackgroundPage } from './background';

export var bgPage = new BackgroundPage()

// chrome.webNavigation.onDOMContentLoaded.addListener(async ({ tabId, url }) => {
//   const { options } = await chrome.storage.local.get('options');
//   chrome.scripting.executeScript({
//     target: tabId,
//     files: ['content.js'],
//     ...options
//   });
// });

