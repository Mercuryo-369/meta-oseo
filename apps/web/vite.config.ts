import { fileURLToPath, URL } from 'node:url';
import templateCompilerOptions from '@tresjs/core/template-compiler-options';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

// El backend FastAPI escucha en :8000 (ver docs/api-contract.md). Se puede cambiar
// con API_PROXY_TARGET, por ejemplo para apuntar a un servidor de pruebas.
const API_TARGET = process.env.API_PROXY_TARGET ?? 'http://localhost:8000';

export default defineConfig({
  plugins: [
    // templateCompilerOptions declara las etiquetas <TresMesh>, <TresAmbientLight>, etc.
    // como elementos personalizados: sin esto Vue avisa "Failed to resolve component".
    // Lo exige el renderizador propio de TresJS (ver README de @tresjs/core).
    vue({ ...templateCompilerOptions }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // Sin reescribir el prefijo: /api/... llega igual a FastAPI.
      '/api': {
        target: API_TARGET,
        changeOrigin: false,
        configure(proxy) {
          // El chat usa SSE (POST /api/chat). Se marca la respuesta para que ningún
          // intermediario la acumule: sin transformaciones y sin buffer.
          proxy.on('proxyRes', (proxyRes) => {
            const tipo = String(proxyRes.headers['content-type'] ?? '');
            if (tipo.includes('text/event-stream')) {
              proxyRes.headers['cache-control'] = 'no-cache, no-transform';
              proxyRes.headers['x-accel-buffering'] = 'no';
            }
          });
        },
      },
    },
  },
  build: {
    // Three.js pesa bastante; solo se carga en la ruta /demo-mandibula (carga perezosa).
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      output: {
        // Cada icono de lucide salía como un chunk de ~1 KB que la página pedía en cascada.
        // Juntos son una sola petición y se cachean a la vez.
        advancedChunks: {
          groups: [
            {
              name: 'vue',
              test: /node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?(?:vue|@vue)\//,
              priority: 2,
            },
            {
              name: 'iconos',
              test: /node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?@lucide\//,
              priority: 1,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.{test,spec}.ts'],
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    // La primera prueba de un archivo que importa three o zod paga la transformación del módulo:
    // con la máquina cargada (CI, otros procesos) supera los 5 s por defecto sin que haya un fallo real.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
