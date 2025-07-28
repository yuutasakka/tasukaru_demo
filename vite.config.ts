import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// 機密情報がビルドに含まれないようにするためのプラグイン
const secretsProtectionPlugin = () => {
  return {
    name: 'secrets-protection',
    transform(code: string, id: string) {
      // 機密情報のパターンを検出
      const secretPatterns = [
        /JWT_SECRET/gi,
        /SESSION_SECRET/gi,
        /TWILIO_AUTH_TOKEN/gi,
        /ENCRYPTION_KEY/gi,
        /CSRF_SECRET/gi,
        /SERVICE_ROLE_KEY/gi,
        /GEMINI_API_KEY/gi,
        /ADMIN_PASSWORD/gi,
        /process\.env\.(?!VITE_|NODE_ENV|MODE)/g
      ];
      
      for (const pattern of secretPatterns) {
        if (pattern.test(code) && !id.includes('node_modules')) {
          console.warn(`\x1b[33m⚠️  警告: ファイル ${id} に機密情報への参照が含まれています\x1b[0m`);
        }
      }
      return null;
    }
  };
};

export default defineConfig(({ mode }) => {
  // 環境変数をロード（VITE_プレフィックスのみ）
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  
  return {
    plugins: [
      secretsProtectionPlugin(),
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                }
              }
            },
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 5
                },
                networkTimeoutSeconds: 3
              }
            }
          ]
        },
        manifest: {
          name: 'タスカル - お金診断アプリ',
          short_name: 'タスカル',
          description: 'あなたに最適な金融商品を診断します',
          theme_color: '#3b82f6',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    server: {
      port: 8081,
      host: '127.0.0.1',
      open: false,
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'http://localhost:8080',
          changeOrigin: true,
          secure: false
        }
      }
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
      // 以下の環境変数はクライアントに露出させない
      'process.env.JWT_SECRET': '""',
      'process.env.SESSION_SECRET': '""',
      'process.env.TWILIO_AUTH_TOKEN': '""',
      'process.env.ENCRYPTION_KEY': '""',
      'process.env.CSRF_SECRET': '""',
      'process.env.SUPABASE_SERVICE_ROLE_KEY': '""',
      'process.env.GEMINI_API_KEY': '""',
      'process.env.ADMIN_PASSWORD_HASH': '""',
      // VITE_プレフィックスでも機密情報は空文字列に
      'import.meta.env.VITE_JWT_SECRET': '""',
      'import.meta.env.VITE_SESSION_SECRET': '""',
      'import.meta.env.VITE_ENCRYPTION_KEY': '""',
      'import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY': '""'
    },
    optimizeDeps: {
      exclude: ['mock-aws-s3', 'aws-sdk', 'nock', '@mapbox/node-pre-gyp']
    },
    build: {
      target: 'es2020',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.warn', 'console.error', 'console.debug'],
          unsafe: false,
          passes: 2
        },
        mangle: {
          safari10: true
        }
      },
      chunkSizeWarningLimit: 300,
      rollupOptions: {
        external: ['mock-aws-s3', 'aws-sdk', 'nock', '@mapbox/node-pre-gyp', /^\.\/server\//],
        output: {
          manualChunks: (id) => {
            // src/api/ と src/lib/supabaseAuth.ts をクライアントビルドから除外
            if (id.includes('src/api/') || id.includes('src/lib/supabaseAuth')) {
              return null; // ビルドから除外
            }
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              if (id.includes('crypto-js') || id.includes('qrcode')) {
                return 'vendor-utils';
              }
              if (id.includes('@emotion')) {
                return 'vendor-emotion';
              }
              return 'vendor-others';
            }
            if (id.includes('src/components/Admin')) {
              return 'admin-components';
            }
            if (id.includes('src/components/Diagnosis') || id.includes('src/components/OptimizedDiagnosis')) {
              return 'diagnosis-components';
            }
            if (id.includes('src/components/Phone') || id.includes('src/components/SMS') || id.includes('src/components/Supabase')) {
              return 'auth-components';
            }
          }
        },
        treeshake: {
          moduleSideEffects: false,
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false
        }
      }
    }
  };
});