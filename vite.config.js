import { defineConfig } from 'vite';

export default defineConfig({
    base: './', // Relative paths
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                main: './index.html'
            }
        }
    }
});