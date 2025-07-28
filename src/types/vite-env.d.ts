/// <reference types="vite/client" />

interface ImportMetaEnv {
  // 公開可能な環境変数のみ
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string // 公開可能なanon key
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_SENTRY_ENVIRONMENT?: string
  
  // 以下の機密情報はクライアントサイドに公開しない
  // readonly VITE_ENCRYPTION_KEY?: string // 削除
  // readonly VITE_JWT_SECRET?: string // 削除
  // readonly VITE_SESSION_SECRET?: string // 削除
  // readonly VITE_SUPABASE_SERVICE_ROLE_KEY?: string // 削除
  
  readonly DEV?: boolean
  readonly PROD?: boolean
  readonly MODE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}