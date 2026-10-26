import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';
import checker from 'vite-plugin-checker';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        vueDevTools(),
        checker({
            vueTsc: {
                tsconfigPath: './tsconfig.app.json',
            },
            terminal: true,
        }),
        VitePWA({
            registerType: 'autoUpdate',
            pwaAssets: { config: true, overrideManifestIcons: true },
            manifest: {
                name: 'Food Planner',
                short_name: 'Food Planner',
                description: 'Weekmenu en boodschappenlijst',
                lang: 'nl',
                display: 'standalone',
                start_url: '/',
                theme_color: '#D2552C',
                background_color: '#FBF8F3',
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
                // Browsers use the woff2 variant of primeicons, skip the legacy formats
                globIgnores: ['**/primeicons-*.{svg,eot,ttf,woff}'],
                navigateFallback: '/index.html',
                navigateFallbackDenylist: [/^\/api\//, /^\/swagger/, /^\/status/],
            },
        }),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    server: {
        // Same origin as in production, so the refresh cookie works without CORS
        proxy: {
            '/api': 'http://localhost:3000',
        },
    },
    css: {
        preprocessorOptions: {
            scss: {
                additionalData: `
                    @use "@/styles/mixins.scss" as *;
                    @use "@/styles/variables.scss" as *;
                `,
            },
        },
    },
});
