import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // 云托管使用绝对路径
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    host: '127.0.0.1',  // 使用IP地址代替localhost
    proxy: {
      '/__auth': {
        target: 'https://envId-appid.tcloudbaseapp.com/',
        changeOrigin: true,
      }
    }
  }
})
