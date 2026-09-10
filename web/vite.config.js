import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served from https://sandeep2k5.github.io/learning-project/, and GitHub
// Pages is configured to publish the /docs folder, so build straight there.
export default defineConfig({
  base: '/learning-project/',
  plugins: [react()],
  build: { outDir: '../docs', emptyOutDir: true }
});
