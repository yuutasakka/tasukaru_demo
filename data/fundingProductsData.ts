// タスカル - 資金調達商品データ
export interface FundingProduct {
  id: string;
  name: string;
  type: 'loan' | 'factoring' | 'credit_line' | 'grant' | 'investment' | 'crowdfunding';
  description: string;
  requirements: string[];
  interestRate: string;
  fundingAmount: string;
  repaymentPeriod: string;
  approvalTime: string;
  pros: string[];
  cons: string[];
  recommendedFor: string[];
  features: string[];
  company: string;
  risk_level: 'low' | 'medium' | 'high';
}

export const fundingProducts: FundingProduct[] = [
  {
    id: 'biz-loan-001',
    name: 'ビジネスローン',
    type: 'loan',
    description: '中小企業向けの無担保・無保証人融資。オンライン完結で最短即日審査。',
    requirements: [
      '法人または個人事業主',
      '事業歴1年以上',
      '年商1000万円以上',
      '税金の未納がない'
    ],
    interestRate: '3.5%〜18.0%',
    fundingAmount: '50万円〜1,000万円',
    repaymentPeriod: '3ヶ月〜5年',
    approvalTime: '最短即日',
    pros: [
      '審査が早い',
      '無担保・無保証人',
      'オンライン完結',
      '繰り上げ返済可能'
    ],
    cons: [
      '金利が銀行より高め',
      '借入限度額が低い',
      '事業歴が必要'
    ],
    recommendedFor: [
      '急な資金需要がある事業者',
      '銀行融資が難しい事業者',
      '少額の運転資金が必要な方'
    ],
    features: [
      'WEB完結申込',
      '最短即日融資',
      '来店不要'
    ],
    company: 'ビジネスローン各社',
    risk_level: 'medium'
  },
  {
    id: 'factoring-001',
    name: 'ファクタリング',
    type: 'factoring',
    description: '売掛債権を現金化するサービス。最短即日で資金調達可能。',
    requirements: [
      '売掛債権を保有',
      '法人または個人事業主',
      '売掛先の信用力'
    ],
    interestRate: '手数料2%〜20%',
    fundingAmount: '30万円〜1億円',
    repaymentPeriod: '売掛金回収時',
    approvalTime: '最短2時間',
    pros: [
      '最短即日現金化',
      '借入ではない',
      '信用情報に影響なし',
      '担保・保証人不要'
    ],
    cons: [
      '手数料が高い',
      '売掛債権が必要',
      '継続利用でコスト増'
    ],
    recommendedFor: [
      '売掛金の回収待ちの事業者',
      '急な資金需要がある方',
      '借入枠を使いたくない方'
    ],
    features: [
      '2社間ファクタリング対応',
      'オンライン完結',
      '秘密厳守'
    ],
    company: 'ファクタリング各社',
    risk_level: 'low'
  },
  {
    id: 'bank-loan-001',
    name: '銀行融資（プロパー融資）',
    type: 'loan',
    description: '銀行からの直接融資。低金利で大型の資金調達が可能。',
    requirements: [
      '決算書2期分',
      '事業計画書',
      '担保・保証人',
      '安定した業績'
    ],
    interestRate: '0.5%〜3.0%',
    fundingAmount: '500万円〜10億円',
    repaymentPeriod: '1年〜30年',
    approvalTime: '2週間〜1ヶ月',
    pros: [
      '低金利',
      '大型融資可能',
      '長期返済可能',
      '信用力向上'
    ],
    cons: [
      '審査が厳しい',
      '時間がかかる',
      '担保・保証人必要',
      '書類が多い'
    ],
    recommendedFor: [
      '業績が安定している企業',
      '設備投資を計画している企業',
      '低金利で借りたい企業'
    ],
    features: [
      '専任担当者',
      '経営相談可能',
      '追加融資相談可'
    ],
    company: '各種銀行',
    risk_level: 'low'
  },
  {
    id: 'credit-guarantee-001',
    name: '信用保証協会付き融資',
    type: 'loan',
    description: '信用保証協会の保証を受けた銀行融資。中小企業向けの定番融資。',
    requirements: [
      '中小企業者',
      '事業歴6ヶ月以上',
      '税金の未納がない',
      '保証料の支払い'
    ],
    interestRate: '1.0%〜2.5% + 保証料',
    fundingAmount: '100万円〜2.8億円',
    repaymentPeriod: '運転資金7年/設備資金10年',
    approvalTime: '2週間〜3週間',
    pros: [
      '銀行融資より審査通りやすい',
      '担保なしでも可能',
      '金利が比較的低い'
    ],
    cons: [
      '保証料が必要',
      '審査に時間がかかる',
      '保証枠に上限あり'
    ],
    recommendedFor: [
      '創業間もない企業',
      '信用力が低い企業',
      '初めて銀行融資を受ける企業'
    ],
    features: [
      '制度融資利用可',
      '経営相談サービス',
      '借換制度あり'
    ],
    company: '信用保証協会・各種銀行',
    risk_level: 'low'
  },
  {
    id: 'govt-loan-001',
    name: '日本政策金融公庫融資',
    type: 'loan',
    description: '政府系金融機関による中小企業・個人事業主向け融資。',
    requirements: [
      '事業計画書',
      '決算書または確定申告書',
      '許認可（必要な業種）',
      '自己資金（創業時）'
    ],
    interestRate: '0.5%〜2.5%',
    fundingAmount: '100万円〜7.2億円',
    repaymentPeriod: '5年〜20年',
    approvalTime: '3週間〜1ヶ月',
    pros: [
      '低金利',
      '無担保・無保証人制度あり',
      '創業資金も対応',
      '据置期間設定可'
    ],
    cons: [
      '審査に時間がかかる',
      '書類が多い',
      '面談が必要'
    ],
    recommendedFor: [
      '創業予定者・創業間もない方',
      '設備投資を行う中小企業',
      'コロナ等で影響を受けた事業者'
    ],
    features: [
      '創業融資制度',
      'セーフティネット貸付',
      '経営改善資金'
    ],
    company: '日本政策金融公庫',
    risk_level: 'low'
  },
  {
    id: 'credit-line-001',
    name: '当座貸越（融資枠）',
    type: 'credit_line',
    description: '設定した融資枠内で自由に借入・返済ができる便利な資金調達方法。',
    requirements: [
      '安定した売上',
      '良好な取引実績',
      '決算書2期分',
      '銀行との取引実績'
    ],
    interestRate: '1.5%〜5.0%',
    fundingAmount: '500万円〜5億円',
    repaymentPeriod: '1年更新',
    approvalTime: '2週間〜1ヶ月',
    pros: [
      '必要な時だけ借入可能',
      '利息は借入分のみ',
      '資金繰りが安定',
      '繰り返し利用可能'
    ],
    cons: [
      '審査が厳しい',
      '更新審査あり',
      '枠の維持手数料'
    ],
    recommendedFor: [
      '季節変動がある事業者',
      '継続的な運転資金需要がある企業',
      '資金繰りを安定させたい企業'
    ],
    features: [
      'ATM利用可能',
      'ネットバンキング対応',
      '自動更新可能'
    ],
    company: '各種銀行',
    risk_level: 'low'
  },
  {
    id: 'merchant-advance-001',
    name: 'マーチャントキャッシュアドバンス',
    type: 'loan',
    description: 'クレジットカード売上を担保にした資金調達。飲食店・小売店向け。',
    requirements: [
      'クレジットカード決済導入済み',
      '月間カード売上50万円以上',
      '事業歴6ヶ月以上'
    ],
    interestRate: '手数料10%〜20%',
    fundingAmount: '50万円〜2,000万円',
    repaymentPeriod: '3ヶ月〜12ヶ月',
    approvalTime: '最短即日',
    pros: [
      '審査が早い',
      '売上連動返済',
      '担保・保証人不要',
      '業績不振でも可能'
    ],
    cons: [
      '手数料が高い',
      'カード売上が必要',
      '返済額が変動'
    ],
    recommendedFor: [
      '飲食店・小売店',
      'カード決済が多い事業者',
      '急な資金需要がある方'
    ],
    features: [
      '売上連動型返済',
      'オンライン申込',
      '最短即日入金'
    ],
    company: 'MCA事業者各社',
    risk_level: 'medium'
  },
  {
    id: 'crowdfunding-001',
    name: '融資型クラウドファンディング',
    type: 'crowdfunding',
    description: '複数の投資家から小口資金を集める新しい資金調達方法。',
    requirements: [
      '事業計画書',
      '財務情報の開示',
      'プロジェクトの魅力',
      '情報発信力'
    ],
    interestRate: '5.0%〜15.0%',
    fundingAmount: '100万円〜1億円',
    repaymentPeriod: '1年〜5年',
    approvalTime: '1ヶ月〜2ヶ月',
    pros: [
      '担保・保証人不要',
      '宣伝効果あり',
      '支援者獲得',
      '新規事業でも可能'
    ],
    cons: [
      '調達に時間がかかる',
      '目標額に届かないリスク',
      '情報開示が必要'
    ],
    recommendedFor: [
      '新規事業を始める企業',
      'BtoC事業者',
      '社会性の高い事業'
    ],
    features: [
      'マーケティング効果',
      'ファン獲得',
      'メディア露出'
    ],
    company: 'クラウドファンディング各社',
    risk_level: 'medium'
  },
  {
    id: 'subsidy-001',
    name: '補助金・助成金',
    type: 'grant',
    description: '返済不要の公的支援制度。設備投資や新規事業に活用可能。',
    requirements: [
      '事業計画書',
      '見積書・契約書',
      '実績報告書',
      '補助対象要件を満たす'
    ],
    interestRate: '返済不要',
    fundingAmount: '50万円〜1億円',
    repaymentPeriod: '返済不要',
    approvalTime: '2ヶ月〜6ヶ月',
    pros: [
      '返済不要',
      '金額が大きい',
      '信用力向上',
      '専門家サポートあり'
    ],
    cons: [
      '競争率が高い',
      '後払いが多い',
      '書類作成が大変',
      '使途が限定的'
    ],
    recommendedFor: [
      '設備投資を行う企業',
      '新規事業を始める企業',
      '研究開発を行う企業'
    ],
    features: [
      'ものづくり補助金',
      'IT導入補助金',
      '事業再構築補助金'
    ],
    company: '各種公的機関',
    risk_level: 'low'
  },
  {
    id: 'asset-backed-001',
    name: 'ABL（動産担保融資）',
    type: 'loan',
    description: '在庫や売掛債権を担保にした融資。流動資産を有効活用。',
    requirements: [
      '在庫または売掛債権',
      '適切な管理体制',
      '評価可能な資産',
      '定期的な報告'
    ],
    interestRate: '2.0%〜8.0%',
    fundingAmount: '1,000万円〜10億円',
    repaymentPeriod: '1年〜5年',
    approvalTime: '3週間〜1ヶ月',
    pros: [
      '流動資産を活用',
      '不動産担保不要',
      '大型融資可能',
      '金利が比較的低い'
    ],
    cons: [
      '管理が煩雑',
      '評価にコストがかかる',
      '資産の変動リスク'
    ],
    recommendedFor: [
      '在庫を多く持つ企業',
      '売掛債権が多い企業',
      '不動産を持たない企業'
    ],
    features: [
      '在庫担保',
      '売掛債権担保',
      'モニタリング付き'
    ],
    company: '大手銀行・商工中金',
    risk_level: 'medium'
  }
];

// 資金調達専門家データ
export interface FundingAdvisor {
  id: string;
  name: string;
  title: string;
  specialties: string[];
  experience: string;
  bio: string;
  successStories: number;
  averageFundingAmount: string;
  image?: string;
}

export const fundingAdvisors: FundingAdvisor[] = [
  {
    id: 'advisor-001',
    name: '山田 太郎',
    title: '資金調達シニアコンサルタント',
    specialties: ['創業融資', '補助金申請', '事業計画策定'],
    experience: '15年',
    bio: '元日本政策金融公庫の融資担当者。1,000件以上の融資審査経験を活かし、確実な資金調達をサポート。',
    successStories: 523,
    averageFundingAmount: '3,500万円'
  },
  {
    id: 'advisor-002',
    name: '佐藤 花子',
    title: 'ファクタリング専門アドバイザー',
    specialties: ['ファクタリング', '売掛債権管理', 'キャッシュフロー改善'],
    experience: '10年',
    bio: '大手ファクタリング会社出身。最適な資金調達タイミングと手法をアドバイス。',
    successStories: 312,
    averageFundingAmount: '1,200万円'
  },
  {
    id: 'advisor-003',
    name: '鈴木 健一',
    title: '補助金・助成金スペシャリスト',
    specialties: ['補助金申請', '助成金活用', '公的支援制度'],
    experience: '12年',
    bio: '中小企業診断士。採択率80%を誇る補助金申請のプロフェッショナル。',
    successStories: 189,
    averageFundingAmount: '2,800万円'
  },
  {
    id: 'advisor-004',
    name: '田中 美咲',
    title: 'スタートアップ資金調達専門家',
    specialties: ['ベンチャー融資', 'エンジェル投資', 'クラウドファンディング'],
    experience: '8年',
    bio: '元VC出身。スタートアップの成長ステージに合わせた最適な資金調達を提案。',
    successStories: 156,
    averageFundingAmount: '5,000万円'
  },
  {
    id: 'advisor-005',
    name: '高橋 誠',
    title: '事業再生・リスケ専門家',
    specialties: ['リスケジュール', '事業再生', '経営改善計画'],
    experience: '20年',
    bio: '銀行出身の事業再生専門家。困難な状況でも最適な解決策を見出します。',
    successStories: 234,
    averageFundingAmount: '8,000万円'
  }
];

// 成功事例データ
export interface SuccessStory {
  id: string;
  companyType: string;
  industry: string;
  challenge: string;
  solution: string;
  result: string;
  fundingAmount: string;
  fundingType: string;
  timeline: string;
}

export const successStories: SuccessStory[] = [
  {
    id: 'story-001',
    companyType: '飲食店（5店舗展開）',
    industry: '飲食業',
    challenge: 'コロナ禍で売上が70%減少。運転資金が枯渇し、従業員の給与支払いも困難に。',
    solution: '日本政策金融公庫のコロナ特別貸付とファクタリングを組み合わせて資金調達。',
    result: '3,000万円の資金調達に成功。事業継続と雇用維持を実現。',
    fundingAmount: '3,000万円',
    fundingType: '公庫融資 + ファクタリング',
    timeline: '2週間'
  },
  {
    id: 'story-002',
    companyType: 'IT企業（創業2年目）',
    industry: 'IT・ソフトウェア',
    challenge: '大型案件受注のため、開発人員を増やす必要があるが資金不足。',
    solution: '創業融資とIT導入補助金を活用。事業計画を精緻に作成。',
    result: '融資1,500万円、補助金300万円を獲得。10名の増員に成功。',
    fundingAmount: '1,800万円',
    fundingType: '創業融資 + IT導入補助金',
    timeline: '1.5ヶ月'
  },
  {
    id: 'story-003',
    companyType: '製造業（従業員30名）',
    industry: '製造業',
    challenge: '老朽化した設備更新に5,000万円必要だが、担保となる不動産がない。',
    solution: 'ものづくり補助金とABL（動産担保融資）を組み合わせて調達。',
    result: '補助金2,000万円、ABL3,000万円で設備更新を実現。生産性30%向上。',
    fundingAmount: '5,000万円',
    fundingType: 'ものづくり補助金 + ABL',
    timeline: '3ヶ月'
  }
];