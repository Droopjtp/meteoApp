import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Same-origin in dev and prod (nginx): no CORS to deal with.
      '/api': 'http://localhost:3000',
    },
  },
});
