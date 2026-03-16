import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    plugins: [
      react(),
      tailwindcss(),
      tsconfigPaths(),
    ],

    build: {
      target: 'esnext',
      minify: 'esbuild',
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
    },

    resolve: {
      tsconfigPaths: true,
      alias: {
        '@': '/src', 
      },
    },

    server: {
      host: true,
      port: 5173,

      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'https://localhost:3000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          secure: true,
        },
      },
    },
  };
});