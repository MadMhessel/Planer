import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Оптимизация для React 19
      jsxRuntime: 'automatic',
      // Отключаем fast refresh для избежания проблем с React 19
      fastRefresh: true,
      // Явно указываем babel опции для совместимости
      babel: {
        plugins: [],
      },
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Увеличиваем лимит предупреждений для больших чанков
    chunkSizeWarningLimit: 1000,
    // Оптимизация для production
    minify: 'esbuild',
    // Включаем source maps для отладки проблем с lazy loading в production
    sourcemap: true,
    // Оптимизация CSS
    cssCodeSplit: true,
    // Оптимизация ассетов
    assetsInlineLimit: 4096, // Инлайним маленькие файлы (< 4KB)
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    // Защита от проблем с lazy loading в production
    rollupOptions: {
      // Сохраняем имена экспортов для правильной работы lazy loading
      // Это критически важно для предотвращения ошибки "Cannot set properties of undefined (setting 'Activity')"
      preserveEntrySignatures: 'strict',
      output: {
        // Улучшенное разделение на чанки для лучшего кэширования
        manualChunks: (id) => {
          // Упрощенное разделение чанков для избежания проблем с React 19
          // React и связанные библиотеки
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-is')) {
            return 'react-vendor';
          }
          // Firebase SDK
          if (id.includes('node_modules/firebase')) {
            return 'firebase-vendor';
          }
          // UI библиотеки (lucide-react, recharts)
          if (id.includes('node_modules/lucide-react') || id.includes('node_modules/recharts')) {
            return 'ui-vendor';
          }
          // AI библиотеки
          if (id.includes('node_modules/@google/generative-ai')) {
            return 'ai-vendor';
          }
          // Остальные node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        // Сохраняем имена экспортов для правильной работы named exports в lazy loading
        // Это критически важно для предотвращения ошибки "Cannot set properties of undefined (setting 'Activity')"
        exports: 'named',
        // Оптимизация имен файлов для кэширования
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/img/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[ext]/[name]-[hash][extname]`;
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  // Оптимизация для разработки
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-is', 'firebase/app', 'firebase/auth', 'firebase/firestore'],
    exclude: [],
    // Принудительно пересобрать зависимости при изменении
    force: false,
  },
})
