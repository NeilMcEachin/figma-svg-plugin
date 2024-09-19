import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { fileURLToPath, URL } from 'url'
import vue from '@vitejs/plugin-vue'
import path from 'path'

const config = defineConfig(({ mode }) => {
  const isDev = mode === 'development'
  return {
    plugins: [vue(), viteSingleFile({removeViteModuleLoader: true})],
    resolve: {
      alias: {
        '~': fileURLToPath(new URL('./node_modules', import.meta.url)),
        '@': fileURLToPath(new URL('./src/ui', import.meta.url)),
      },
    },
    build: {
      outDir: 'plugin',
      minify: !isDev,
      watch: isDev ? {} : null,
      sourcemap: false,
      emptyOutDir: false,
      rollupOptions: {
        output: {
          // Add rollup output options here if required
        },
        input: {
          index: path.resolve(__dirname, 'src/ui/index.html'),
        },
      },
    },
  }
})

export default config
