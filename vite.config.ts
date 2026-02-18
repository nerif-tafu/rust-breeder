import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  optimizeDeps: {
    // Avoid "No sources are declared in this source map" for pre-bundled deps
    esbuildOptions: { sourcemap: false },
  },
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
    nodePolyfills({
      include: ['buffer', 'stream', 'util', 'zlib'],
      globals: { Buffer: true, global: true, process: true },
    }),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        // Dart Sass legacy JS API deprecation warning fix (Vite 5.x)
        api: 'modern-compiler',
        silenceDeprecations: ['legacy-js-api'],
        additionalData: `@use "@/scss/variables.scss" as *;`,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Stub Node-only modules so deps (Jimp, tesseract, file-type) don't pull in fs/path in browser
      fs: fileURLToPath(new URL('./src/stubs/fs.ts', import.meta.url)),
      path: fileURLToPath(new URL('./src/stubs/path.ts', import.meta.url)),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'process.env': '{}',
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    // Jimp and other Node-style deps reference these in the bundle; define for browser
    __dirname: JSON.stringify('/'),
    __filename: JSON.stringify('/index.js'),
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
