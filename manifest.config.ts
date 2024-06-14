import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json';

export default defineManifest(async () => {
  return {
    manifest_version: 3,
    name: pkg.name.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    description: pkg.description,
    // default_locale: 'en',
    version: '0.0.1',
    icons: {
      16: "images/bshell_16x16.png",
      32: "images/bshell_32x32.png",
      48: "images/bshell_48x48.png",
      128: "images/bshell_128x128.png"
    },
    background: {
      service_worker: 'src/background/index.ts',
      type: 'module',
    },
    permissions: [
      "scripting",
      'storage',
      "tabs",
      "webNavigation",
      "clipboardRead",
      "clipboardWrite",
      "downloads",
      "downloads.open",
    ],
    host_permissions: ["<all_urls>"], // 'https://*/*', 'http://*/*'],
    content_scripts: [
      {
        matches: [
          "<all_urls>"
        ],
        css: [],
        js: [
          "src/content/content.ts",
        ]
      },
    ],
    web_accessible_resources: [
      {
        resources: [
          "*.css",
          // "terminal.css",
          "vendor/selectorgadget_combined.js",
          "vendor/selectorgadget_combined.css",
          "assets/*.js",
          "assets/*.css",
        ],
        matches: [
          "<all_urls>"
        ],
        use_dynamic_url: true,
      },
    ],
    // commands: {
    //   'open-shell': {
    //     suggested_key: {
    //       default: "Ctrl+Z",
    //     },
    //     description: "Open shell",
    //   },
    // },
    action: {
      default_icon: {
        16: "images/bshell_16x16.png",
        32: "images/bshell_32x32.png",
        48: "images/bshell_48x48.png",
        128: "images/bshell_128x128.png",
      },
      default_title: "BShell",
      default_popup: "settings.html"
    }
  }
})
