import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config'


export default defineConfig(({ mode }) => {
  return {
    publicDir: "public",
    plugins: [
      tsconfigPaths(),
      crx({ manifest })
    ],
    envPrefix: 'BSHELL_',
    build: {
      emptyOutDir: !process.argv.includes('--watch'),
      minify: mode === 'production',
      sourcemap: true,
      rollupOptions: {
        input: {
          'terminal': 'src/content/terminal/terminal.css',
          'assets/utils': 'src/utils/index.ts',
          'assets/load': 'src/utils/load.ts',
          'assets/background': 'src/background/background.ts',
          'assets/content': 'src/content/content.ts',
          'assets/term': 'src/content/terminal/Terminal.ts',
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileName: '[name].js',
          assetFileNames: ({ name }) => {
            if (name.endsWith('.css')) {
              return '[name][extname]';
            }
            return '[name]-[hash]';
          },
        },
      },
    },
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
  }
});
