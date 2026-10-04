import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const CHUNK_MAP = {
  'react': 'vendor-react',
  'react-dom': 'vendor-react',
  '@supabase/supabase-js': 'vendor-supabase',
  'lucide-react': 'vendor-icons',
};

export default defineConfig({
  plugins: [react()],
  cacheDir: '/tmp/sprig_vite_cache',
  build: {
    rolldownOptions: {
      external: ['capacitor-health-connect', '@perfood/capacitor-healthkit'],
      output: {
        manualChunks(id) {
          for (const [pkg, chunk] of Object.entries(CHUNK_MAP)) {
            if (id.includes(`/node_modules/${pkg}/`)) return chunk;
          }
        },
      },
    },
  },
})
