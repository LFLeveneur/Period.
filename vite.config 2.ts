import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  server: {
    allowedHosts: ['semihumanistic-noncontagious-crew.ngrok-free.dev'],
  },
  resolve: {
    alias: {
      // Alias @/ vers src/ pour les imports absolus
      '@': resolve(__dirname, './src'),
    },
  },
});
