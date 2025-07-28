
// data/financialProductsData.ts
import { FinancialProduct } from '../types';

export const allFinancialProducts: FinancialProduct[] = [
  {
    id: 'stocks',
    name: '株式（エクイティ）',
    shortDescription: '企業の成長に期待。株価上昇や配当金が魅力。',
    longDescription: '個別企業の株式を購入し、株価上昇や配当によるリターンを狙う。中長期での成長期待や配当収入が目的。',
    iconClass: 'fas fa-chart-line',
    tags: ['growth', 'long-term', 'dividend', 'experienced-friendly'],
    representativeCompanies: [
      { id: 'sbi_securities_stocks', name: 'SBI証券', websiteUrl: 'https://www.sbisec.co.jp/', actionText: '口座開設はこちら (無料)' },
      { id: 'rakuten_securities_stocks', name: '楽天証券', websiteUrl: 'https://www.rakuten-sec.co.jp/', actionText: '口座開設はこちら (無料)' },
    ]
  },
  {
    id: 'bonds',
    name: '債券（固定収益型）',
    shortDescription: '比較的低リスク。定期的な利息収入。',
    longDescription: '国債・社債などを購入し、あらかじめ決まった利率（クーポン）を受け取る。株式よりリスクは低いが、リターンも小さめ。',
    iconClass: 'fas fa-file-contract',
    tags: ['stable', 'fixed-income', 'lower-risk'],
    representativeCompanies: [
      { id: 'smbc_nikko_bonds', name: 'SMBC日興証券', websiteUrl: 'https://www.smbcnikko.co.jp/', actionText: '詳しく見てみる (無料)' },
    ]
  },
  {
    id: 'investment_trusts_etf',
    name: '投資信託・ETF',
    shortDescription: '少額から分散投資。プロにおまかせも。',
    longDescription: '公募／私募投資信託：複数の株式・債券などをプロが運用。少額から投資でき、分散効果が高い。\nETF（上場投資信託）：証券取引所で株式のように売買できる。手数料が低いものが多い。',
    iconClass: 'fas fa-cubes',
    tags: ['beginner-friendly', 'diversified', 'professional-managed', 'small-amount', 'low-cost'],
    representativeCompanies: [
      { id: 'sbi_securities_trust', name: 'SBI証券 (投信)', websiteUrl: 'https://www.sbisec.co.jp/ETGate/?_ControlID=WPLETmgR001Control&_PageID=DefaultPID&_Action=DefaultAID&getFlg=on', actionText: '商品ラインナップを見る (無料)' },
      { id: 'monex_trust', name: 'マネックス証券 (投信)', websiteUrl: 'https://www.monex.co.jp/fund/', actionText: '詳しく見てみる (無料)' },
    ]
  },
  {
    id: 'reit',
    name: 'REIT（不動産投資信託）',
    shortDescription: '不動産で資産運用。家賃収入や売却益に期待。',
    longDescription: '商業ビルや住宅など不動産に投資し、賃料収入や売却益を分配金として受け取る。上場型は株式同様に売買可能。',
    iconClass: 'fas fa-city',
    tags: ['real-estate', 'income', 'diversified'],
    alwaysRecommend: true,
    representativeCompanies: [
      { id: 'mitsubishi_reit', name: '三菱地所物流リート投資法人', websiteUrl: 'https://mel-reit.co.jp/', actionText: '詳細情報を見る (無料)' },
      { id: 'daiwa_reit', name: '大和証券リビング投資法人', websiteUrl: 'https://www.daiwa-grp.jp/sc/company/related/asset/dlr/', actionText: '公式サイトへ (無料)' },
    ]
  },
  {
    id: 'fx',
    name: '外貨預金・FX',
    shortDescription: '為替変動で利益を狙う。レバレッジ取引も可能。',
    longDescription: '外貨預金・為替証拠金取引（FX）：通貨ペアの為替差益を狙う。レバレッジを効かせることで大きなリターンも狙えるが、その分リスクも高い。',
    iconClass: 'fas fa-exchange-alt',
    tags: ['currency', 'high-risk', 'high-return', 'leverage'],
    alwaysRecommend: true,
    representativeCompanies: [
      { id: 'gmo_click_fx', name: 'GMOクリック証券 (FX)', websiteUrl: 'https://www.click-sec.com/corp/guide/fxneo/', actionText: '口座開設はこちら (無料)' },
      { id: 'dmm_fx', name: 'DMM FX', websiteUrl: 'https://fx.dmm.com/', actionText: '口座開設はこちら (無料)' },
    ]
  },
  {
    id: 'commodities',
    name: 'コモディティ（商品）',
    shortDescription: '金や原油などに投資。インフレ対策にも。',
    longDescription: '金・原油・農産物などに投資。インフレヘッジとして、あるいは相場変動を利用した短期売買で運用。',
    iconClass: 'fas fa-gem',
    tags: ['alternative', 'inflation-hedge', 'experienced-friendly'],
    representativeCompanies: [
      { id: 'kozakai_commodity', name: '小堺化学工業 (金)', websiteUrl: 'https://www.kozakai-chem.co.jp/product/detail/gold.html', actionText: '金について知る (無料)' },
    ]
  },
  {
    id: 'derivatives',
    name: 'デリバティブ',
    shortDescription: '高度な金融取引。リスクヘッジや大きなリターンも。',
    longDescription: '将来の売買をあらかじめ約束する先物取引や、売買権利を取引するオプション取引。ヘッジやレバレッジ運用に。',
    iconClass: 'fas fa-cogs',
    tags: ['advanced', 'high-risk', 'leverage', 'hedging', 'experienced-friendly'],
     representativeCompanies: [
      { id: 'jpx_derivatives', name: '日本取引所グループ (JPX)', websiteUrl: 'https://www.jpx.co.jp/derivatives/index.html', actionText: '市場情報を確認 (無料)' },
    ]
  },
  {
    id: 'insurance_products',
    name: '保険商品（変額・年金）',
    shortDescription: '保障と運用を両立。税制優遇も魅力。',
    longDescription: '変額保険・年金保険などの保険商品：保険機能を持ちつつ、運用実績に応じた給付金が受け取れるもの。税制優遇がある商品も。',
    iconClass: 'fas fa-shield-alt',
    tags: ['insurance', 'long-term', 'tax-efficient'],
    representativeCompanies: [
      { id: 'sony_life_insurance', name: 'ソニー生命保険', websiteUrl: 'https://www.sonylife.co.jp/contractor/goods_study/list/variable/', actionText: '変額保険を調べる (無料)' },
    ]
  },
  {
    id: 'deposits',
    name: '定期預金・普通預金',
    shortDescription: '元本保証で安心。資金の一時置き場に。',
    longDescription: '元本保証だが、金利は非常に低い。資金の余裕確保・流動性確保用として利用。',
    iconClass: 'fas fa-piggy-bank',
    tags: ['stable', 'low-risk', 'liquidity', 'capital-preservation', 'beginner-friendly'],
     representativeCompanies: [
      { id: 'mufg_bank_deposit', name: '三菱UFJ銀行', websiteUrl: 'https://www.bk.mufg.jp/kouza/yokin/index.html', actionText: '預金商品を見る (無料)' },
    ]
  },
  {
    id: 'ideco_nisa',
    name: 'iDeCo・NISA制度',
    shortDescription: '税金がお得になる制度。長期的な資産形成に。',
    longDescription: 'iDeCo（個人型確定拠出年金）・つみたてNISA・一般NISA：投資信託や株式などを非課税で運用できる税制優遇制度。長期積立・分散投資に有利。',
    iconClass: 'fas fa-seedling',
    tags: ['tax-efficient', 'long-term', 'beginner-friendly', 'diversified', 'small-amount'],
    representativeCompanies: [
      { id: 'rakuten_nisa', name: '楽天証券 (NISA)', websiteUrl: 'https://www.rakuten-sec.co.jp/nisa/', actionText: 'NISA口座開設 (無料)' },
      { id: 'sbi_ideco', name: 'SBI証券 (iDeCo)', websiteUrl: 'https://www.sbisec.co.jp/ETGate/?_ControlID=WPLETmgR001Control&_PageID=DefaultPID&_Action=DefaultAID&N_ID=idecoTopP', actionText: 'iDeCoを始める (無料)' },
    ]
  },
  {
    id: 'robo_advisor',
    name: 'ロボアドバイザー',
    shortDescription: 'AIが自動で運用。初心者でも手軽にスタート。',
    longDescription: '質問に答えるだけで、アルゴリズムが最適なポートフォリオを自動で組成・運用。初心者向け。',
    iconClass: 'fas fa-robot',
    tags: ['beginner-friendly', 'automated', 'diversified', 'easy'],
    representativeCompanies: [
      { id: 'wealthnavi', name: 'WealthNavi (ウェルスナビ)', websiteUrl: 'https://www.wealthnavi.com/', actionText: '無料診断を試す' },
      { id: 'theo', name: 'THEO (テオ)', websiteUrl: 'https://theo.blue/', actionText: '詳しく見てみる (無料)' },
    ]
  },
  {
    id: 'p2p_lending',
    name: 'P2Pレンディング',
    shortDescription: '個人や企業にお金を貸して利息を得る。',
    longDescription: '個人間や小口投資家向けに貸付を行い、利息収入を得る。比較的新しい運用手段。',
    iconClass: 'fas fa-users',
    tags: ['alternative', 'income', 'higher-risk', 'experienced-friendly'],
    representativeCompanies: [
      { id: 'crowd_bank', name: 'クラウドバンク', websiteUrl: 'https://crowdbank.jp/', actionText: '口座開設はこちら (無料)' },
    ]
  },
  {
    id: 'hedge_funds_pe',
    name: 'ヘッジファンド等',
    shortDescription: '富裕層向け。プロが特別な戦略で運用。',
    longDescription: 'ヘッジファンド・プライベート・エクイティ：プロが高度な戦略で運用。最低投資額や手数料が高めのため、富裕層向け。',
    iconClass: 'fas fa-chess-knight',
    tags: ['advanced', 'high-net-worth', 'alternative', 'experienced-friendly'],
    representativeCompanies: [
      { id: 'example_hedge_fund', name: '例: ヘッジファンドA (要紹介)', websiteUrl: '#', actionText: '情報請求 (要問い合わせ)' },
    ]
  },
  {
    id: 'crypto',
    name: '暗号資産（仮想通貨）',
    shortDescription: '高いリターンも期待。価格変動リスクに注意。',
    longDescription: 'ビットコインやイーサリアムなど。値動きが激しいため、リスク許容度が高い方向け。',
    iconClass: 'fab fa-bitcoin',
    tags: ['crypto', 'high-risk', 'high-return', 'volatile'],
    alwaysRecommend: true,
    representativeCompanies: [
      { id: 'coincheck', name: 'Coincheck (コインチェック)', websiteUrl: 'https://coincheck.com/ja/', actionText: '口座開設はこちら (無料)' },
      { id: 'bitflyer', name: 'bitFlyer (ビットフライヤー)', websiteUrl: 'https://bitflyer.com/ja-jp/', actionText: '口座開設はこちら (無料)' },
    ]
  },
];