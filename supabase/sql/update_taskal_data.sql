-- タスカル用データ更新SQL
-- 既存の投資系データを資金調達系データに更新

-- 1. product_settings テーブルの更新
UPDATE product_settings 
SET product_data = '{
  "products": [
    {
      "id": "biz-loan-001",
      "name": "ビジネスローン",
      "type": "loan",
      "description": "中小企業向けの無担保・無保証人融資。オンライン完結で最短即日審査。",
      "interestRate": "3.5%〜18.0%",
      "fundingAmount": "50万円〜1,000万円",
      "approvalTime": "最短即日",
      "company": "ビジネスローン各社",
      "risk_level": "medium"
    },
    {
      "id": "factoring-001",
      "name": "ファクタリング",
      "type": "factoring",
      "description": "売掛債権を現金化するサービス。最短即日で資金調達可能。",
      "interestRate": "手数料2%〜20%",
      "fundingAmount": "30万円〜1億円",
      "approvalTime": "最短2時間",
      "company": "ファクタリング各社",
      "risk_level": "low"
    },
    {
      "id": "bank-loan-001",
      "name": "銀行融資（プロパー融資）",
      "type": "loan",
      "description": "銀行からの直接融資。低金利で大型の資金調達が可能。",
      "interestRate": "0.5%〜3.0%",
      "fundingAmount": "500万円〜10億円",
      "approvalTime": "2週間〜1ヶ月",
      "company": "各種銀行",
      "risk_level": "low"
    },
    {
      "id": "credit-guarantee-001",
      "name": "信用保証協会付き融資",
      "type": "loan",
      "description": "信用保証協会の保証を受けた銀行融資。中小企業向けの定番融資。",
      "interestRate": "1.0%〜2.5% + 保証料",
      "fundingAmount": "100万円〜2.8億円",
      "approvalTime": "2週間〜3週間",
      "company": "信用保証協会・各種銀行",
      "risk_level": "low"
    },
    {
      "id": "govt-loan-001",
      "name": "日本政策金融公庫融資",
      "type": "loan",
      "description": "政府系金融機関による中小企業・個人事業主向け融資。",
      "interestRate": "0.5%〜2.5%",
      "fundingAmount": "100万円〜7.2億円",
      "approvalTime": "3週間〜1ヶ月",
      "company": "日本政策金融公庫",
      "risk_level": "low"
    }
  ]
}'::jsonb
WHERE id = 1;

-- 2. expert_contact_settings テーブルの更新
UPDATE expert_contact_settings 
SET expert_name = 'タスカル専門アドバイザー',
    description = 'タスカルの認定資金調達コンサルタントが、お客様の資金調達に関するご相談を承ります。',
    phone_number = '0120-123-456',
    email = 'support@taskal.jp',
    available_hours = '平日 9:00-18:00'
WHERE id = 1;

-- 3. testimonials テーブルの更新（資金調達成功事例に変更）
DELETE FROM testimonials WHERE id IN (1, 2, 3);

INSERT INTO testimonials (id, name, age, occupation, testimonial, rating, created_at) VALUES
(1, '田中 一郎', 45, '製造業経営者', 'コロナ禍で売上が激減し困っていましたが、タスカルの診断で最適な資金調達方法を提案していただき、3週間で2,000万円の融資を受けることができました。おかげで事業を継続できています。', 5, NOW()),
(2, '佐藤 美咲', 38, 'IT企業代表', '創業2年目で銀行からの融資が難しい状況でしたが、ファクタリングという方法を教えていただき、即日で500万円の資金調達に成功。新規案件を受注できました。', 5, NOW()),
(3, '鈴木 健太', 52, '飲食店オーナー', '5店舗展開のための設備資金で悩んでいましたが、補助金とビジネスローンを組み合わせた提案で、総額5,000万円の調達に成功。計画通り出店できました。', 4, NOW()),
(4, '山田 花子', 41, '建設業経営者', 'リスケ中で新規融資は無理だと思っていましたが、ファクタリングで月々1,000万円の資金繰り改善ができ、経営が安定しました。', 5, NOW()),
(5, '高橋 誠', 35, 'EC事業者', '在庫増加で資金繰りが厳しくなりましたが、ABL（動産担保融資）という方法で3,000万円を調達。季節商材の仕入れを拡大できました。', 4, NOW());

-- 4. homepage_content_settings テーブルの更新
UPDATE homepage_content_settings 
SET content_data = jsonb_set(
  content_data,
  '{company_name}',
  '"タスカル株式会社"'
)
WHERE setting_name = 'main_content';

UPDATE homepage_content_settings 
SET content_data = jsonb_set(
  content_data,
  '{service_description}',
  '"30秒で分かる資金調達力診断 - あなたに最適な資金調達方法をご提案"'
)
WHERE setting_name = 'main_content';

UPDATE homepage_content_settings 
SET content_data = jsonb_set(
  content_data,
  '{main_headline}',
  '"あなたの資金調達力をチェック！"'
)
WHERE setting_name = 'main_content';

-- 5. financial_planners テーブルを funding_advisors として更新
-- テーブル名は変更せず、内容のみ更新
UPDATE financial_planners 
SET name = 'タスカル専門アドバイザー',
    title = '資金調達シニアコンサルタント',
    bio = 'タスカルの認定資金調達コンサルタント。銀行・ノンバンク・公的機関での豊富な経験を活かし、お客様に最適な資金調達方法をご提案します。',
    specialties = '{"創業融資", "ビジネスローン", "ファクタリング", "補助金申請", "事業計画策定"}',
    experience_years = 15,
    contact_email = 'advisor@taskal.jp',
    phone_number = '0120-123-456'
WHERE id = 1;

-- 6. 新しい funding_products テーブルを作成（既存のproduct_settingsと並行）
CREATE TABLE IF NOT EXISTS funding_products (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  interest_rate VARCHAR(100),
  funding_amount VARCHAR(100),
  repayment_period VARCHAR(100),
  approval_time VARCHAR(100),
  company VARCHAR(200),
  risk_level VARCHAR(20),
  requirements TEXT[],
  pros TEXT[],
  cons TEXT[],
  recommended_for TEXT[],
  features TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- funding_products テーブルにデータを挿入
INSERT INTO funding_products (
  product_id, name, type, description, interest_rate, funding_amount, 
  repayment_period, approval_time, company, risk_level, requirements, 
  pros, cons, recommended_for, features
) VALUES
('biz-loan-001', 'ビジネスローン', 'loan', 
 '中小企業向けの無担保・無保証人融資。オンライン完結で最短即日審査。',
 '3.5%〜18.0%', '50万円〜1,000万円', '3ヶ月〜5年', '最短即日', 
 'ビジネスローン各社', 'medium',
 ARRAY['法人または個人事業主', '事業歴1年以上', '年商1000万円以上', '税金の未納がない'],
 ARRAY['審査が早い', '無担保・無保証人', 'オンライン完結', '繰り上げ返済可能'],
 ARRAY['金利が銀行より高め', '借入限度額が低い', '事業歴が必要'],
 ARRAY['急な資金需要がある事業者', '銀行融資が難しい事業者', '少額の運転資金が必要な方'],
 ARRAY['WEB完結申込', '最短即日融資', '来店不要']),

('factoring-001', 'ファクタリング', 'factoring',
 '売掛債権を現金化するサービス。最短即日で資金調達可能。',
 '手数料2%〜20%', '30万円〜1億円', '売掛金回収時', '最短2時間',
 'ファクタリング各社', 'low',
 ARRAY['売掛債権を保有', '法人または個人事業主', '売掛先の信用力'],
 ARRAY['最短即日現金化', '借入ではない', '信用情報に影響なし', '担保・保証人不要'],
 ARRAY['手数料が高い', '売掛債権が必要', '継続利用でコスト増'],
 ARRAY['売掛金の回収待ちの事業者', '急な資金需要がある方', '借入枠を使いたくない方'],
 ARRAY['2社間ファクタリング対応', 'オンライン完結', '秘密厳守']),

('govt-loan-001', '日本政策金融公庫融資', 'loan',
 '政府系金融機関による中小企業・個人事業主向け融資。',
 '0.5%〜2.5%', '100万円〜7.2億円', '5年〜20年', '3週間〜1ヶ月',
 '日本政策金融公庫', 'low',
 ARRAY['事業計画書', '決算書または確定申告書', '許認可（必要な業種）', '自己資金（創業時）'],
 ARRAY['低金利', '無担保・無保証人制度あり', '創業資金も対応', '据置期間設定可'],
 ARRAY['審査に時間がかかる', '書類が多い', '面談が必要'],
 ARRAY['創業予定者・創業間もない方', '設備投資を行う中小企業', 'コロナ等で影響を受けた事業者'],
 ARRAY['創業融資制度', 'セーフティネット貸付', '経営改善資金']);

-- 7. FAQ項目をテーブル化（現在はコンポーネントにハードコード）
CREATE TABLE IF NOT EXISTS faq_items (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FAQ データを挿入
INSERT INTO faq_items (category, question, answer, display_order) VALUES
('basics', 'タスカルのサービスは本当に無料ですか？', 'はい、診断から資金調達のご提案まで完全無料です。成功報酬もいただきません。提携金融機関から紹介料をいただくビジネスモデルのため、お客様からは一切費用をいただきません。', 1),
('basics', '他の資金調達サービスとの違いは何ですか？', 'タスカルは「資金調達力診断」により、お客様の現在の調達可能性を可視化します。30秒の診断で、どの資金調達方法が最適か、審査通過の可能性はどの程度かを判定し、最適な金融機関をご紹介します。', 2),
('basics', '個人事業主でも利用できますか？', 'はい、法人・個人事業主問わずご利用いただけます。それぞれの事業形態に合わせた最適な資金調達方法をご提案いたします。', 3),
('screening', '診断結果が低かった場合、資金調達は難しいですか？', '診断結果は現時点での目安です。結果が低くても、適切な準備と対策により資金調達は可能です。無料の攻略本では、各スコアを改善する具体的な方法をご紹介しています。', 4),
('screening', '赤字決算でも資金調達は可能ですか？', '可能です。ファクタリングや補助金など、決算内容に左右されにくい資金調達方法があります。また、事業計画をしっかり作成することで、将来性を評価してもらえる融資もあります。', 5),
('methods', 'ファクタリングとは何ですか？', '売掛債権（請求書）を買い取ってもらい、早期に現金化する方法です。借入ではないため、負債にならず信用情報にも影響しません。最短即日で資金調達が可能です。', 6),
('security', '個人情報は安全に管理されますか？', 'SSL暗号化通信により、すべての情報は安全に保護されています。また、お客様の同意なく第三者に情報を提供することはありません。', 7);

-- 8. 会社設定の更新
UPDATE company_settings 
SET company_name = 'タスカル株式会社',
    service_name = 'タスカル',
    description = '30秒で分かる資金調達力診断サービス',
    contact_email = 'info@taskal.jp',
    support_email = 'support@taskal.jp',
    phone_number = '0120-123-456'
WHERE id = 1;

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_funding_products_type ON funding_products(type);
CREATE INDEX IF NOT EXISTS idx_funding_products_active ON funding_products(is_active);
CREATE INDEX IF NOT EXISTS idx_faq_items_category ON faq_items(category);
CREATE INDEX IF NOT EXISTS idx_faq_items_active ON faq_items(is_active);

-- 更新日時を記録
INSERT INTO data_migrations (migration_name, executed_at, description) VALUES
('update_taskal_data', NOW(), 'Convert investment platform data to funding/loan platform data for Taskal service')
ON CONFLICT (migration_name) DO UPDATE SET 
  executed_at = NOW(), 
  description = 'Convert investment platform data to funding/loan platform data for Taskal service';

COMMIT;