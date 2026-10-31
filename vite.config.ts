import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    // Everything under test runs in plain Node: JSZip reads and writes File
    // and Blob there, and the Web Audio parts are stubbed per test.
    environment: 'node',
    unstubGlobals: true,
  },
});
