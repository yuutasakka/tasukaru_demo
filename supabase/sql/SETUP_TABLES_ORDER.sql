-- テーブル作成の正しい順序
-- Supabase SQL Editorで以下の順番で実行してください

-- 1. まず admins テーブルを作成（他のテーブルが参照するため）
-- Run: 036_create_admins_table.sql

-- 2. 次に admin_registrations テーブルを作成（admins テーブルを参照）
-- Run: 037_create_admin_registrations_table.sql

-- 3. 最後に registration_requests テーブルを作成（独立したテーブル）
-- Run: 038_create_registration_requests_table.sql

-- 注意事項:
-- 1. 各SQLファイルを順番に実行してください
-- 2. エラーが発生した場合は、既存のテーブルとの競合を確認してください
-- 3. 本番環境では、adminsテーブルのデフォルトパスワードを必ず変更してください