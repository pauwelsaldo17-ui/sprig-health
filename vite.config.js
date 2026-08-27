import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  cacheDir: '/tmp/sprig_vite_cache',
  build: {
    rollupOptions: {
      external: ['capacitor-health-connect'],
      output: {
        manualChunks: {
          'vendor-react':    ['react', 'react-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-icons':    ['lucide-react'],
        },
      },
    },
  },
})
