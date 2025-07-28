# レート制限監視システム

## 概要
包括的なレート制限監視とセキュリティ分析のためのCLIツールとデータベースビューを実装しました。

## 主な機能

### 1. Atomicなレート制限実装
- PostgreSQLのトランザクションとロックを使用
- `check_rate_limit_atomic`関数でレースコンディションを防止
- 同時リクエスト時の正確なカウント保証

### 2. リアルタイム監視ビュー
```sql
-- レート制限状況の確認
SELECT * FROM rate_limit_status WHERE identifier = '+819012345678';

-- OTP TTLの確認
SELECT * FROM otp_ttl_status WHERE phone_number = '+819012345678';

-- 異常検知
SELECT * FROM anomaly_detection WHERE severity IN ('HIGH', 'CRITICAL');

-- 統計情報
SELECT * FROM rate_limit_statistics;
```

### 3. CLIコマンド

#### インストール
```bash
npm install
```

#### 基本的な使用方法
```bash
# レート制限ステータス確認
npm run monitor status phone +819012345678
npm run monitor status ip 192.168.1.1

# OTP TTL確認
npm run monitor otp +819012345678

# 異常検知
npm run monitor anomalies -- -h 24

# ダッシュボード表示
npm run monitor dashboard

# 期限切れOTPのクリーンアップ
npm run monitor cleanup

# リアルタイム監視
npm run monitor watch -- -i 5
```

### 4. 監視項目

#### レート制限
- 電話番号: 1時間に3回まで
- IPアドレス: 1時間に10回まで
- デバイスフィンガープリント: 1時間に5回まで

#### 異常検知パターン
- HIGH_VOLUME_IP: 同一IPからの大量リクエスト
- FREQUENT_PHONE_REQUESTS: 同一電話番号への頻繁なリクエスト
- IP_HOPPING: 同一電話番号に対する複数IPからのアクセス
- PHONE_ENUMERATION: 同一IPから複数電話番号への送信

### 5. ログ記録
すべての重要なイベントは構造化ログとして記録：
- 送信失敗
- ブロック発生
- 異常検知
- レート制限超過

### 6. 自動クリーンアップ
- 24時間経過した未使用OTPの自動削除
- セキュリティイベントのアーカイブ
- ログローテーション

### 7. ホワイトリスト管理
特定の電話番号やIPアドレスをレート制限から除外：
```sql
-- ホワイトリスト追加
INSERT INTO rate_limit_whitelist (identifier, identifier_type, reason)
VALUES ('+819012345678', 'phone', 'VIPユーザー');

-- ホワイトリスト確認
SELECT * FROM whitelist_status;
```

### 8. パフォーマンス最適化
- 監視用の専用インデックス
- 時間範囲を限定したパーティショニング
- 効率的なクエリプラン

## セキュリティ強化ポイント

1. **レースコンディション対策**
   - Atomicな実装により同時リクエストでの漏れを防止

2. **包括的なログ記録**
   - 失敗・ブロック時の詳細情報を確実に記録

3. **リアルタイム監視**
   - 異常なパターンを即座に検出

4. **柔軟な設定**
   - 閾値やルールをデータベースレベルで管理

## 今後の拡張予定

1. **自動アラート**
   - Slack/Email通知の統合
   - 閾値ベースの自動アラート

2. **機械学習統合**
   - 異常検知の精度向上
   - パターン学習による予測

3. **ダッシュボードUI**
   - Webベースの監視ダッシュボード
   - リアルタイムグラフ表示

4. **バックアップ・リストア**
   - 自動バックアップスケジュール
   - ポイントインタイムリカバリ