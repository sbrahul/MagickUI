import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  assetsInclude: ['**/*.wasm'],
  optimizeDeps: {
    exclude: ['@imagemagick/magick-wasm'],
  },
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@imagemagick/magick-wasm')) return 'vendor-magick'
          if (id.includes('framer-motion') || id.includes('@radix-ui')) return 'vendor-ui'
          if (id.includes('react-dom') || id.includes('react/')) return 'vendor-react'
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
