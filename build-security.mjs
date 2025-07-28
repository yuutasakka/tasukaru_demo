// ビルド後のセキュリティチェックと修正
import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const DIST_DIR = './dist';
const SENSITIVE_PATTERNS = [
  // 環境変数パターン
  /VITE_JWT_SECRET['":\s]*['"]\w+['"]/gi,
  /VITE_SESSION_SECRET['":\s]*['"]\w+['"]/gi,
  /VITE_ENCRYPTION_KEY['":\s]*['"]\w+['"]/gi,
  /VITE_SUPABASE_SERVICE_ROLE_KEY['":\s]*['"]\w+['"]/gi,
  /JWT_SECRET['":\s]*['"]\w+['"]/gi,
  /SESSION_SECRET['":\s]*['"]\w+['"]/gi,
  /ENCRYPTION_KEY['":\s]*['"]\w+['"]/gi,
  /TWILIO_AUTH_TOKEN['":\s]*['"]\w+['"]/gi,
  /CSRF_SECRET['":\s]*['"]\w+['"]/gi,
  /ADMIN_PASSWORD['":\s]*['"]\w+['"]/gi,
  // Base64エンコードされた可能性のあるシークレット
  /['"](eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+)['"]/g,
  // 長い英数字の文字列（APIキーの可能性）
  /['"](sk_[A-Za-z0-9]{32,})['"]/g,
  /['"](pk_[A-Za-z0-9]{32,})['"]/g
];

async function scanAndCleanFiles(dir) {
  const files = await readdir(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = join(dir, file.name);
    
    if (file.isDirectory()) {
      await scanAndCleanFiles(fullPath);
    } else if (file.name.endsWith('.js')) {
      await cleanJavaScriptFile(fullPath);
    }
  }
}

async function cleanJavaScriptFile(filePath) {
  try {
    let content = await readFile(filePath, 'utf-8');
    let modified = false;
    
    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(content)) {
        console.log(`🔍 機密情報パターンを検出: ${filePath}`);
        // パターンにマッチした部分を空文字列に置換
        content = content.replace(pattern, (match) => {
          // キー名は残して値だけを空にする
          if (match.includes(':')) {
            const key = match.split(':')[0];
            return `${key}:""`;
          }
          return '""';
        });
        modified = true;
      }
    }
    
    if (modified) {
      await writeFile(filePath, content, 'utf-8');
      console.log(`✅ クリーンアップ完了: ${filePath}`);
    }
  } catch (error) {
    console.error(`エラー: ${filePath}`, error);
  }
}

// メイン処理
console.log('🔒 ビルド後のセキュリティチェックを開始...');
scanAndCleanFiles(DIST_DIR)
  .then(() => console.log('✅ セキュリティチェック完了'))
  .catch(error => {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  });