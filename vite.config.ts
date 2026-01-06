import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // WICHTIG: Erlaubt das Deployment in Unterordnern auf GitHub Pages
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});