import { defineConfig } from 'vite';
import swc from 'unplugin-swc';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
