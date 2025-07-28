-- 登録データを確認するSQL

-- 1. admin_registrationsテーブルのデータを確認
SELECT 
    id,
    email,
    full_name,
    phone_number,
    status,
    created_at
FROM public.admin_registrations
ORDER BY created_at DESC
LIMIT 10;

-- 2. 件数を確認
SELECT COUNT(*) as total_registrations
FROM public.admin_registrations;

-- 3. ステータス別の件数
SELECT 
    status,
    COUNT(*) as count
FROM public.admin_registrations
GROUP BY status;