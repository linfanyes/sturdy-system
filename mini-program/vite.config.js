import { defineConfig } from 'vite'
import uniPlugin from '@dcloudio/vite-plugin-uni'
import path from 'path'

const uni = uniPlugin.default || uniPlugin

export default defineConfig({
  plugins: [uni()],
  build: { rollupOptions: { external: ['tim-wx-sdk', 'tim-upload-plugin'] } },
  resolve: {
    alias: {
      '@gardener/shared': path.resolve(__dirname, '../shared'),
    },
  },
})
