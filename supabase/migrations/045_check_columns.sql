-- Check columns for tables that need policies
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN (
    'notification_settings',
    'payment_history',
    'subscriptions',
    'user_profiles',
    'user_sessions',
    'user_usage_logs'
)
AND column_name IN ('id', 'user_id', 'phone_number', 'admin_id')
ORDER BY table_name, column_name;