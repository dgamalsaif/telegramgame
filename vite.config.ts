
import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    // We hardcode the provided key here so the rest of the app can still use process.env.API_KEY exclusively as per guidelines
    'process.env.API_KEY': JSON.stringify('AIzaSyAP_CGARvttdtHuSHT2miICvwsBHa45his')
  },
  build: {
    outDir: 'dist',
    target: 'esnext'
  },
  server: {
    port: 3000
  }
});
