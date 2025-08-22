import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Adicione esta seção para configurar o CSS e PostCSS
  css: {
    postcss: './postcss.config.js', // Garante que o Vite use seu postcss.config.js
  },
});