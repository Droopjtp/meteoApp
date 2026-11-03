import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: 'esm',
  target: 'node24',
  platform: 'node',
  clean: true,
  sourcemap: true,
  // The shared package is consumed as TS source: bundle it into the output.
  noExternal: ['@meteo/shared'],
});
