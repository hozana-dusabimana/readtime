import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The backend (http://localhost:8080 by default) allows requests from this dev server's port.
export default defineConfig({
    plugins: [react()],
    base: './',   // relative asset paths, so dist/ also works when served from a sub-folder
    server: { port: 5500, strictPort: true },
    preview: { port: 5500, strictPort: true }
});
