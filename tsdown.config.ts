import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  clean: true,
  sourcemap: true,
  minify: false,
  target: 'node20',
  external: ['better-sqlite3'],
  banner: {
    js: '#!/usr/bin/env node',
  },
});
