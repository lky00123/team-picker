import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './', // 相对路径: FastAPI根路径托管/GitHub Pages子路径都兼容
})
