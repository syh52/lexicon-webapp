import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 使用相对路径，适配静态托管CDN
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true, // 构建前自动清空输出目录
    assetsDir: 'assets',
    sourcemap: false,
    // 优化构建配置
    target: 'es2015',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)$/.test(assetInfo.name)) {
            return `media/[name]-[hash].${ext}`;
          }
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(assetInfo.name)) {
            return `img/[name]-[hash].${ext}`;
          }
          if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name)) {
            return `fonts/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        }
      }
    },
    // 性能优化 - CloudBase静态托管最佳实践
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: false,
    // 启用压缩和优化
    cssCodeSplit: true,
    // 预加载配置
    modulePreload: {
      polyfill: false
    }
  },
  server: {
    host: '127.0.0.1',  // 开发环境使用IP地址
    port: 5173,
    open: true,
    cors: true
  },
  // 优化依赖处理
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@cloudbase/js-sdk',
      'framer-motion',
      'lucide-react'
    ],
    exclude: ['@cloudbase/cli']
  },
  // 定义全局变量
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __PROD__: JSON.stringify(process.env.NODE_ENV === 'production')
  }
})
