import { defineConfig } from 'vite'
import packageJson from './package.json'

const config = defineConfig(({ mode }) => {
  const isDev = mode === 'development'
  return {
    build: {
      outDir: 'plugin/src/code',
      minify: !isDev,
      watch: isDev ? {} : null,
      sourcemap: false,
      emptyOutDir: false,
      lib: {
        entry: './src/code/index.ts',
        name: packageJson.name,
        formats: ['es']
      },
      rollupOptions: {
        output: {
          entryFileNames: 'index.js',
          extend: true
        }
      }
    }
  }
})

export default config
