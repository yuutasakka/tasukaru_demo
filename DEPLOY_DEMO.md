# 🚀 デモ環境デプロイガイド

外部体験用のデモ環境をデプロイするための手順書です。

## 📋 前提条件

- Supabaseプロジェクトの作成
- Vercelアカウントの設定
- GitHubリポジトリの準備

## 🛠️ セットアップ手順

### 1. Supabaseセットアップ

#### 1.1 新しいプロジェクト作成
```bash
# Supabaseプロジェクトを作成
# https://supabase.com/dashboard で新しいプロジェクトを作成
```

#### 1.2 デモ用テーブル作成
```bash
# マイグレーションの実行
supabase migration up
```

または、Supabase Dashboardで以下のSQLを実行：
```sql
-- supabase/migrations/055_create_demo_tables.sql の内容を実行
```

#### 1.3 環境変数の取得
以下の値をSupabase Dashboardから取得：
- `Project URL`
- `Service Role Key`
- `Anon Key`

### 2. Vercelデプロイ

#### 2.1 リポジトリ接続
1. Vercel Dashboardにログイン
2. 「New Project」をクリック
3. GitHubリポジトリを選択

#### 2.2 環境変数設定
Vercel Dashboard > Settings > Environment Variables で以下を設定：

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# デモ機能設定 (オプション)
DEMO_MODE=true
DEMO_SESSION_TIMEOUT=1800000
DEMO_MAX_SESSIONS_PER_IP=3
```

#### 2.3 ビルド設定
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install --legacy-peer-deps"
}
```

### 3. デモ機能の動作確認

#### 3.1 基本動作テスト
1. デプロイされたURLにアクセス
2. 「デモ環境を試す」ボタンの表示確認
3. デモアクセス要求の実行
4. デモ用電話番号での認証テスト

#### 3.2 セキュリティテスト
```bash
# レート制限のテスト
curl -X POST https://your-app.vercel.app/api/demo-send-otp \
  -H "Content-Type: application/json" \
  -d '{"requestDemoAccess": true}'

# 無効な電話番号でのテスト
curl -X POST https://your-app.vercel.app/api/demo-send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "09012345678", "demoToken": "invalid"}'
```

## 🔧 カスタマイズ設定

### デモ用電話番号の変更
`src/config/demoConfig.ts` を編集：
```typescript
export const DEMO_CONFIG = {
  phoneNumbers: [
    '09000000001', // 変更可能
    '09000000002',
    // 追加可能
  ],
  otpCode: '123456', // 変更可能
  // ...
};
```

### セッション時間の調整
```typescript
session: {
  timeout: 30 * 60 * 1000, // 30分（ミリ秒）
  maxConcurrentSessions: 50,
  maxSessionsPerIP: 3,
}
```

### レート制限の調整
```typescript
rateLimit: {
  smsPerMinute: 3,
  smsPerHour: 10,
  verifyAttempts: 5,
}
```

## 📊 監視とメンテナンス

### ログの確認
```sql
-- デモアクセスログの確認
SELECT * FROM demo_access_logs 
ORDER BY created_at DESC 
LIMIT 100;

-- アクティブセッション数の確認
SELECT COUNT(*) as active_sessions 
FROM demo_sessions 
WHERE is_active = true 
AND expires_at > NOW();
```

### データベースクリーンアップ
```sql
-- 手動クリーンアップの実行
SELECT cleanup_expired_demo_data();

-- 統計情報の確認
SELECT * FROM demo_statistics;
```

### 自動クリーンアップの設定
Supabaseのcron機能を使用：
```sql
-- 1時間ごとにクリーンアップを実行
SELECT cron.schedule(
  'demo-cleanup',
  '0 * * * *',
  'SELECT cleanup_expired_demo_data();'
);
```

## 🔒 セキュリティチェックリスト

- [ ] Supabase Row Level Security (RLS) が有効
- [ ] 環境変数の適切な設定
- [ ] レート制限の動作確認
- [ ] IPアドレス制限の確認
- [ ] CORS設定の確認
- [ ] セキュリティヘッダーの設定
- [ ] データ暗号化の確認

## 🚨 トラブルシューティング

### よくある問題

**問題**: デモAPIが404エラーを返す
**解決**: Vercelのファンクション設定を確認し、`api/` フォルダ内のファイルが正しくデプロイされているか確認

**問題**: Supabaseの接続エラー
**解決**: 環境変数の設定と、SupabaseのAPIキーの権限を確認

**問題**: レート制限が機能しない
**解決**: データベースのタイムゾーン設定とクエリの条件を確認

**問題**: デモセッションが期限切れにならない
**解決**: 自動クリーンアップ関数の実行を確認

### ログの確認方法

#### Vercelログ
```bash
# Vercel CLIを使用
vercel logs https://your-app.vercel.app
```

#### Supabaseログ
```sql
-- エラーログの確認
SELECT * FROM demo_access_logs 
WHERE response_status >= 400 
ORDER BY created_at DESC;
```

## 📈 パフォーマンス最適化

### データベース最適化
```sql
-- インデックスの確認
\d demo_sessions

-- クエリプランの確認
EXPLAIN ANALYZE SELECT * FROM demo_sessions 
WHERE is_active = true;
```

### CDN設定
Vercelの自動CDN設定により、静的アセットは最適化されます。

## 🔄 更新とデプロイ

### 新しい機能のデプロイ
```bash
# 変更をコミット
git add .
git commit -m "デモ機能の更新"

# Vercelに自動デプロイ
git push origin main
```

### ホットフィックス
```bash
# 緊急修正の場合
git checkout -b hotfix/demo-security-fix
# 修正を実装
git commit -m "🔥 緊急修正: デモセキュリティ"
git push origin hotfix/demo-security-fix
# プルリクエストを作成
```

## 📞 サポート

デプロイに関する問題やサポートが必要な場合：

- **Vercel**: https://vercel.com/support
- **Supabase**: https://supabase.com/support
- **GitHub Issues**: リポジトリのIssuesページ

---

**注意**: デモ環境は外部の人が自由にアクセスできるため、定期的な監視とメンテナンスを行ってください。