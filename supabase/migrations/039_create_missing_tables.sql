-- 不足しているテーブルを作成

-- 1. admin_settings テーブル
CREATE TABLE IF NOT EXISTS public.admin_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON public.admin_settings(setting_key);

-- RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- ポリシー
CREATE POLICY "Public can read admin_settings" ON public.admin_settings
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Authenticated can manage admin_settings" ON public.admin_settings
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 2. legal_links テーブル
CREATE TABLE IF NOT EXISTS public.legal_links (
    id SERIAL PRIMARY KEY,
    link_type VARCHAR(50) NOT NULL,
    url TEXT NOT NULL,
    title VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_legal_links_active ON public.legal_links(is_active);
CREATE INDEX IF NOT EXISTS idx_legal_links_type ON public.legal_links(link_type);

-- RLS
ALTER TABLE public.legal_links ENABLE ROW LEVEL SECURITY;

-- ポリシー
CREATE POLICY "Public can read active legal_links" ON public.legal_links
    FOR SELECT
    TO public
    USING (is_active = true);

CREATE POLICY "Authenticated can manage legal_links" ON public.legal_links
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 3. homepage_content_settings テーブル
CREATE TABLE IF NOT EXISTS public.homepage_content_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_data JSONB,
    content_data JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_homepage_content_key ON public.homepage_content_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_homepage_content_active ON public.homepage_content_settings(is_active);

-- RLS
ALTER TABLE public.homepage_content_settings ENABLE ROW LEVEL SECURITY;

-- ポリシー
CREATE POLICY "Public can read active homepage_content" ON public.homepage_content_settings
    FOR SELECT
    TO public
    USING (is_active = true);

CREATE POLICY "Authenticated can manage homepage_content" ON public.homepage_content_settings
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 4. expert_contact_settings テーブル
CREATE TABLE IF NOT EXISTS public.expert_contact_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    expert_name VARCHAR(255),
    phone_number VARCHAR(50),
    email VARCHAR(255),
    title VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_expert_contact_key ON public.expert_contact_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_expert_contact_active ON public.expert_contact_settings(is_active);

-- RLS
ALTER TABLE public.expert_contact_settings ENABLE ROW LEVEL SECURITY;

-- ポリシー
CREATE POLICY "Public can read active expert_contact" ON public.expert_contact_settings
    FOR SELECT
    TO public
    USING (is_active = true);

CREATE POLICY "Authenticated can manage expert_contact" ON public.expert_contact_settings
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5. 更新日時を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガーを設定
CREATE TRIGGER update_admin_settings_updated_at
    BEFORE UPDATE ON public.admin_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_legal_links_updated_at
    BEFORE UPDATE ON public.legal_links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_homepage_content_settings_updated_at
    BEFORE UPDATE ON public.homepage_content_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expert_contact_settings_updated_at
    BEFORE UPDATE ON public.expert_contact_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. 権限付与
GRANT ALL ON public.admin_settings TO authenticated;
GRANT SELECT ON public.admin_settings TO anon;

GRANT ALL ON public.legal_links TO authenticated;
GRANT SELECT ON public.legal_links TO anon;

GRANT ALL ON public.homepage_content_settings TO authenticated;
GRANT SELECT ON public.homepage_content_settings TO anon;

GRANT ALL ON public.expert_contact_settings TO authenticated;
GRANT SELECT ON public.expert_contact_settings TO anon;