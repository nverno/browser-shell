import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json';

export default defineManifest(async () => {
  return {
    manifest_version: 3,
    name: pkg.name.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    description: pkg.description,
    // default_locale: 'en',
    version: '0.0.1',
    "icons": {
      "16": "images/bshell_16x16.png",
      "32": "images/bshell_32x32.png",
      "48": "images/bshell_48x48.png",
      "128": "images/bshell_128x128.png"
    },
    background: {
      service_worker: 'src/background/index.ts',
      type: 'module',
    },
    "permissions": [
      "scripting",
      'storage',
      "tabs",
      "webNavigation",
      "clipboardRead",
      "clipboardWrite",
    ],
    host_permissions: ['https://*/*', 'http://*/*'],
    content_scripts: [
      {
        "matches": [
          "<all_urls>"
        ],
        "css": [],
        "js": [
          "src/content/content.ts",
        ]
      },
    ],
    "web_accessible_resources": [
      {
        "resources": [
          "*.css",
          // "terminal.css",
          "vendor/selectorgadget_combined.js",
          "vendor/selectorgadget_combined.css",
          "assets/**/*.map",
          "assets/**/*.js",
          "assets/**/*.css",
          "styles/**/*.css",
        ],
        "matches": [
          "<all_urls>"
        ],
      },
    ],
    "action": {
      "default_icon": {
        "19": "images/bshell_19x19.png",
        "38": "images/bshell_38x38.png"
      },
      "default_title": "BShell"
    }
  }
})
