import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // `npm run dev` only: forward functions to Netlify (run `netlify dev` on 8888 in another terminal).
    // Or set VITE_NETLIFY_FUNCTIONS_ORIGIN instead of relying on this proxy.
    proxy: {
      '/.netlify/functions': {
        target: 'http://127.0.0.1:8888',
        changeOrigin: true,
      },
    },
  },
})
