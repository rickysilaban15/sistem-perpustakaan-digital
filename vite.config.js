import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    build: {
        commonjsOptions: {
            include: [/node_modules/],
            transformMixedEsModules: true
        },
        rollupOptions: {
            external: ['react-is'],
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom'],
                    charts: ['recharts'],
                    pdf: ['jspdf', 'jspdf-autotable']
                }
            }
        }
    },
    optimizeDeps: {
        include: [
            'react',
            'react-dom',
            'react-router-dom',
            'recharts',
            'jspdf',
            'jspdf-autotable',
            'react-is'
        ],
        exclude: []
    },
    server: {
        fs: {
            strict: false
        }
    }
});
