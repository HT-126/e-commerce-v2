import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // `@/` means `src/` (the admin's shadcn/ui files import it).
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  server: {
    port: 5174,
    strictPort: true,
    // Same origin in dev, so the sign-in cookie works and CORS is not needed.
    proxy: { '/api': 'http://localhost:3002' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
  },
});
