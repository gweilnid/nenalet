import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Web běží pod https://b2bsaas.cz/nenalet/ - proto relativní cesty (base './').
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../backend/nenalet/web',
    emptyOutDir: true,
    assetsDir: 'assets',
  },
});
