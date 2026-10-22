import { fileURLToPath } from 'node:url'
import templateCompilerOptions from '@tresjs/core/template-compiler-options'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  plugins: [vue(templateCompilerOptions)],
  resolve: {
    alias: {
      'tunnel-rat-vue': fileURLToPath(
        new URL(command === 'serve' ? '../src/index.ts' : '../dist/index.mjs', import.meta.url),
      ),
    },
    dedupe: ['vue', 'three'],
  },
  server: { host: '127.0.0.1' },
}))
