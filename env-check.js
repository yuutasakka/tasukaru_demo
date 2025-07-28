// 環境変数チェックスクリプト
// ビルド前に機密情報が露出していないか確認

import fs from 'fs';
import path from 'path';

const SENSITIVE_PATTERNS = [
  'JWT_SECRET',
  'SESSION_SECRET',
  'TWILIO_AUTH_TOKEN',
  'ENCRYPTION_KEY',
  'CSRF_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GEMINI_API_KEY',
  'ADMIN_PASSWORD',
  'API_KEY',
  'SECRET_KEY',
  'PRIVATE_KEY'
];

// VITE_で始まらない環境変数の使用をチェック
function checkForSensitiveEnvVars(dir) {
  const files = fs.readdirSync(dir);
  let hasIssues = false;

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !['node_modules', 'dist', '.git'].includes(file)) {
      if (checkForSensitiveEnvVars(filePath)) {
        hasIssues = true;
      }
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx'))) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // process.env.XXX の使用をチェック（VITE_で始まるものを除く）
      const processEnvPattern = /process\.env\.(?!VITE_|NODE_ENV|MODE)(\w+)/g;
      const matches = content.match(processEnvPattern);
      
      if (matches) {
        console.error(`\x1b[31m❌ エラー: ${filePath} でセキュアでない環境変数の使用が検出されました:\x1b[0m`);
        matches.forEach(match => {
          console.error(`   - ${match}`);
        });
        hasIssues = true;
      }

      // 機密パターンの直接的な使用をチェック（コメントとnull代入を除外）
      SENSITIVE_PATTERNS.forEach(pattern => {
        // コメント行とnull代入を除外したパターン
        const dangerousPatterns = [
          // 環境変数からの読み取り
          new RegExp(`process\\.env\\.${pattern}`, 'gi'),
          // import.meta.envからの読み取り
          new RegExp(`import\\.meta\\.env\\.${pattern}`, 'gi'),
          // 文字列リテラルとして使用（null代入を除外）
          new RegExp(`['"\`]${pattern}['"\`](?!\\s*:\\s*null)`, 'gi')
        ];
        
        // コメントを除去したコンテンツ
        const contentWithoutComments = content
          .replace(/\/\*[\s\S]*?\*\//g, '') // ブロックコメント除去
          .replace(/\/\/.*$/gm, ''); // 行コメント除去
        
        dangerousPatterns.forEach(regex => {
          if (regex.test(contentWithoutComments)) {
            console.error(`\x1b[31m❌ エラー: ${filePath} で機密情報パターン "${pattern}" が検出されました\x1b[0m`);
            hasIssues = true;
          }
        });
      });
    }
  });

  return hasIssues;
}

console.log('🔍 環境変数のセキュリティチェックを開始します...\n');

// クライアントサイドのコードのみチェック（apiディレクトリはサーバーサイドなので除外）
const srcHasIssues = checkForSensitiveEnvVars('./src');

// apiディレクトリは Vercel Functions として別環境で実行されるため、チェック対象外
console.log('\x1b[36mℹ️  apiディレクトリはサーバーサイドコード（Vercel Functions）のため、チェックをスキップしました。\x1b[0m');

if (srcHasIssues) {
  console.error('\n\x1b[31m❌ セキュリティ問題が検出されました！ビルドを中止してください。\x1b[0m');
  console.error('\x1b[33m⚠️  機密情報はサーバーサイドでのみ使用し、VITE_プレフィックスを使用しないでください。\x1b[0m');
  process.exit(1);
} else {
  console.log('\n\x1b[32m✅ セキュリティチェック完了: 問題は検出されませんでした。\x1b[0m');
}