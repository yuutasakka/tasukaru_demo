// タスカル サンプルデータ
// 管理画面で変更可能な項目の初期データ

import { Testimonial, LegalLink } from '../types';
import { ReasonsToChooseData, FirstConsultationOffer, HeaderData, MainVisualData, FooterData } from '../data/homepageContentData';
import { allFinancialProducts } from './financialProductsData';

// 証言・レビューのサンプルデータ
export const sampleTestimonials: Testimonial[] = [
  {
    id: 'testimonial_001',
    nameAndRole: "山田さん（38歳・運送業）",
    avatarEmoji: "👨",
    ratingStars: 5,
    text: "トラックの買い替えでファクタリングを検討していましたが、診断のおかげで手数料の安い会社を見つけることができました。資金繰りが楽になり、事業の拡大にも取り組めています。診断結果が分かりやすく、初めてでも安心して利用できました。"
  },
  {
    id: 'testimonial_002',
    nameAndRole: "佐藤さん（42歳・飲食店経営）",
    avatarEmoji: "👩",
    ratingStars: 5,
    text: "コロナで売上が落ち込んだ時、どこに相談すればいいか分からず困っていました。診断で自分に合う融資先が見つかり、店を続けることができています。スタッフの雇用も維持でき、本当に助かりました。"
  },
  {
    id: 'testimonial_003',
    nameAndRole: "田中さん（35歳・建設業）",
    avatarEmoji: "👨",
    ratingStars: 4,
    text: "急な設備投資で資金が必要でしたが、診断結果を見て最適な調達方法がすぐに分かりました。複数の選択肢を比較できるのが便利で、金利の低い銀行融資を利用することができました。おかげで事業を拡大できました。"
  },
  {
    id: 'testimonial_004',
    nameAndRole: "鈴木さん（29歳・フリーランス）",
    avatarEmoji: "👩",
    ratingStars: 5,
    text: "個人事業主でも借りられるか不安でしたが、診断結果で複数の選択肢が見つかり安心しました。ビジネスローンやクレジットカードなど、自分の状況に合った資金調達方法を教えてもらい、事業拡大に向けて前向きに取り組めています。"
  },
  {
    id: 'testimonial_005',
    nameAndRole: "高橋さん（40歳・製造業）",
    avatarEmoji: "👨",
    ratingStars: 4,
    text: "設備更新の資金調達で悩んでいましたが、タスカルの診断で政府系金融機関の低金利融資を知ることができました。手続きもサポートしてもらい、想定より低い金利で借り入れできました。計画的な設備投資が実現できています。"
  },
  {
    id: 'testimonial_006',
    nameAndRole: "伊藤さん（33歳・美容室経営）",
    avatarEmoji: "👩",
    ratingStars: 5,
    text: "店舗改装の資金が必要で、どこから借りればいいか迷っていました。診断で複数の選択肢を提示してもらい、自分に最適な条件の融資を受けることができました。おかげで理想的な店舗リニューアルが実現できました。"
  }
];

// リーガルリンクのサンプルデータ
export const sampleLegalLinks: LegalLink[] = [
  {
    id: 1,
    link_type: 'privacy_policy',
    title: 'プライバシーポリシー',
    url: '/privacy-policy',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    link_type: 'terms_of_service',
    title: '利用規約',
    url: '/terms-of-service',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 3,
    link_type: 'specified_commercial_transactions',
    title: '特定商取引法に基づく表記',
    url: '/specified-commercial-transactions',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 4,
    link_type: 'company_info',
    title: '金融商品仲介業について',
    url: '/financial-intermediary',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 5,
    link_type: 'company_info',
    title: 'お問い合わせ',
    url: '/contact',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 6,
    link_type: 'company_info',
    title: '会社概要',
    url: '/company',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// タスカルを選ぶ理由のサンプルデータ
export const sampleReasonsToChoose: ReasonsToChooseData = {
  title: "タスカルが選ばれる理由",
  subtitle: "あなたに最適な資金調達をサポートする3つの強み",
  reasons: [
    {
      iconClass: "fas fa-bullseye",
      title: "パーソナライズされた診断",
      value: "100%",
      description: "AI技術と金融の専門知識を組み合わせ、あなたの事業に最適な資金調達方法を提案します",
      animationDelay: "0s"
    },
    {
      iconClass: "fas fa-shield-alt",
      title: "業界最高水準のセキュリティ",
      value: "100%",
      description: "金融機関レベルのセキュリティシステムで、お客様の大切な事業情報を守ります",
      animationDelay: "0.5s"
    },
    {
      iconClass: "fas fa-phone",
      title: "充実したサポート体制",
      value: "24/7",
      description: "経験豊富な資金調達アドバイザーが、個人事業主から法人まで丁寧にサポートします",
      animationDelay: "1s"
    }
  ]
};

// 初回相談特典のサンプルデータ
export const sampleFirstConsultationOffer: FirstConsultationOffer = {
  title: "初回相談無料キャンペーン",
  description: "タスカルの専門アドバイザーが、あなたの診断結果を詳しく解説し、最適な資金調達戦略をご提案します。詳細な診断結果の解説（30分）、個別資金調達戦略の提案、リスク管理アドバイス、融資制度の活用方法、継続サポートプランのご案内を無料で行います。",
  icon: "fas fa-gift",
  backgroundColor: "rgba(34, 197, 94, 0.1)",
  borderColor: "var(--accent-gold)"
};

// ヘッダーデータのサンプル
export const sampleHeaderData: HeaderData = {
  title: "タスカル",
  subtitle: "あなたの資金調達パートナー"
};

// メインビジュアルデータのサンプル
export const sampleMainVisualData: MainVisualData = {
  title: "あなたに最適な資金調達方法を見つけよう",
  highlightWord: "最適",
  subtitle: "3分の簡単診断で、あなたの事業規模、業種、資金需要、返済能力に基づいた最適な資金調達方法をご提案。個人事業主から法人まで、誰でも安心して利用できる資金調達をサポートします。"
};

// フッターデータのサンプル
export const sampleFooterData: FooterData = {
  siteName: "タスカル",
  description: "AI技術と金融の専門知識を組み合わせ、あなたの事業資金調達を成功に導く信頼できるパートナーです。一人ひとりに最適な資金調達戦略をご提案し、安心できる事業成長をサポートいたします。",
  contactInfo: "電話: 0120-123-456 | メール: info@taskal.co.jp",
  companyInfo: "〒100-0001 東京都千代田区千代田1-1-1 | 平日 9:00-18:00",
  copyright: "© 2024 タスカル株式会社. All rights reserved."
};

// 通知設定のサンプルデータ
export const sampleNotificationSettings = {
  email: {
    enabled: true,
    smtpServer: "smtp.gmail.com",
    smtpPort: "587",
    smtpUser: "notifications@taskal.co.jp",
    smtpPassword: "[SMTP_PASSWORD_PLACEHOLDER]", // 本番環境では環境変数で管理
    fromEmail: "notifications@taskal.co.jp",
    fromName: "タスカル通知システム"
  },
  slack: {
    enabled: false,
    webhookUrl: "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
    channel: "#notifications",
    username: "タスカル Bot"
  },
  line: {
    enabled: false,
    channelAccessToken: "[LINE_CHANNEL_ACCESS_TOKEN_PLACEHOLDER]",
    channelSecret: "[LINE_CHANNEL_SECRET_PLACEHOLDER]"
  },
  chatwork: {
    enabled: false,
    apiToken: "[CHATWORK_API_TOKEN_PLACEHOLDER]",
    roomId: "your-room-id"
  }
};

// 初期化関数：アプリケーション起動時にサンプルデータを設定
export const initializeSampleData = () => {
  try {
    // 証言データの初期化
    const existingTestimonials = sessionStorage.getItem('testimonials');
    if (!existingTestimonials) {
      sessionStorage.setItem('testimonials', JSON.stringify(sampleTestimonials));
    }

    // リーガルリンクの初期化
    const existingLegalLinks = sessionStorage.getItem('legal_links');
    if (!existingLegalLinks) {
      sessionStorage.setItem('legal_links', JSON.stringify(sampleLegalLinks));
    }

    // ホームページコンテンツの初期化
    const existingReasonsToChoose = sessionStorage.getItem('homepage_content_reasons_to_choose');
    if (!existingReasonsToChoose) {
      sessionStorage.setItem('homepage_content_reasons_to_choose', JSON.stringify(sampleReasonsToChoose));
    }

    const existingFirstConsultation = sessionStorage.getItem('first_consultation_offer');
    if (!existingFirstConsultation) {
      sessionStorage.setItem('first_consultation_offer', JSON.stringify(sampleFirstConsultationOffer));
    }

    // ヘッダー・メインビジュアル・フッターの初期化
    const existingHeaderData = sessionStorage.getItem('homepage_content_header_data');
    if (!existingHeaderData) {
      sessionStorage.setItem('homepage_content_header_data', JSON.stringify(sampleHeaderData));
    }

    const existingMainVisualData = sessionStorage.getItem('homepage_content_main_visual_data');
    if (!existingMainVisualData) {
      sessionStorage.setItem('homepage_content_main_visual_data', JSON.stringify(sampleMainVisualData));
    }

    const existingFooterData = sessionStorage.getItem('homepage_content_footer_data');
    if (!existingFooterData) {
      sessionStorage.setItem('homepage_content_footer_data', JSON.stringify(sampleFooterData));
    }

    // 通知設定の初期化
    const existingNotificationSettings = sessionStorage.getItem('notification_settings');
    if (!existingNotificationSettings) {
      sessionStorage.setItem('notification_settings', JSON.stringify(sampleNotificationSettings));
    }

    // 金融商品データの初期化
    const existingProductSettings = sessionStorage.getItem('productSettings');
    if (!existingProductSettings) {
      sessionStorage.setItem('productSettings', JSON.stringify(allFinancialProducts));
    }

    return true;
  } catch (error) {
    return false;
  }
};

// 管理画面用：サンプルデータをリセットする関数
export const resetToSampleData = () => {
  try {
    sessionStorage.setItem('testimonials', JSON.stringify(sampleTestimonials));
    sessionStorage.setItem('legal_links', JSON.stringify(sampleLegalLinks));
    sessionStorage.setItem('homepage_content_reasons_to_choose', JSON.stringify(sampleReasonsToChoose));
    sessionStorage.setItem('first_consultation_offer', JSON.stringify(sampleFirstConsultationOffer));
    sessionStorage.setItem('homepage_content_header_data', JSON.stringify(sampleHeaderData));
    sessionStorage.setItem('homepage_content_main_visual_data', JSON.stringify(sampleMainVisualData));
    sessionStorage.setItem('homepage_content_footer_data', JSON.stringify(sampleFooterData));
    sessionStorage.setItem('notification_settings', JSON.stringify(sampleNotificationSettings));
    sessionStorage.setItem('productSettings', JSON.stringify(allFinancialProducts));
    
    return true;
  } catch (error) {
    return false;
  }
}; 