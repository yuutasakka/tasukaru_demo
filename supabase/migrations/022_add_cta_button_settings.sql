-- CTA（今すぐ相談を始める）ボタンの設定を追加

-- homepage_content_settingsテーブルにCTAボタン設定を挿入
INSERT INTO homepage_content_settings (setting_key, setting_data, description, is_active)
VALUES (
  'cta_button_config',
  '{
    "button_text": "今すぐ無料相談を始める",
    "button_type": "scroll_to_diagnosis",
    "button_url": "",
    "phone_number": "0120-999-888",
    "phone_hours": "平日9:00-18:00",
    "button_style": {
      "bg_color": "from-blue-500 to-blue-600",
      "hover_color": "from-blue-600 to-blue-700",
      "text_color": "text-white",
      "icon": "fas fa-comments"
    }
  }'::jsonb,
  'CTAボタンの表示設定（テキスト、リンク先、電話番号）',
  true
) ON CONFLICT (setting_key) DO UPDATE SET
  setting_data = EXCLUDED.setting_data,
  updated_at = NOW();

-- 設定の確認
SELECT setting_key, setting_data, description, is_active 
FROM homepage_content_settings 
WHERE setting_key = 'cta_button_config';