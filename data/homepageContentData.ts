export interface ReasonToChoose {
  iconClass: string;
  title: string;
  value: string;
  description: string;
  animationDelay: string;
}

export interface ReasonsToChooseData {
  title: string;
  subtitle: string;
  reasons: ReasonToChoose[];
}

export interface FirstConsultationOffer {
  title: string;
  description: string;
  icon: string;
  backgroundColor: string;
  borderColor: string;
}

// ヘッダー設定の型定義
export interface HeaderData {
  title: string;
  subtitle: string; // モバイル用サブタイトル
}

// メインビジュアルメッセージの型定義
export interface MainVisualData {
  title: string;
  highlightWord: string; // ハイライトする単語
  subtitle: string;
}

// フッター設定の型定義
export interface FooterData {
  siteName: string;
  description: string;
  companyInfo: string;
  contactInfo: string;
  copyright: string;
}

// CTAボタン設定の型定義
export interface CTAButtonConfig {
  button_text: string;
  button_type: 'scroll_to_diagnosis' | 'external_url' | 'phone_call';
  button_url: string;
  phone_number: string;
  phone_hours: string;
  button_style: {
    bg_color: string;
    hover_color: string;
    text_color: string;
    icon: string;
  };
}

export const defaultReasonsToChooseData: ReasonsToChooseData = {
  title: "タスカルが選ばれる理由",
  subtitle: "多くのお客様から信頼をいただいている、確かな実績をご紹介します",
  reasons: [
    {
      iconClass: "fas fa-thumbs-up",
      title: "お客様満足度",
      value: "98.8%",
      description: "継続的なサポートによる高い満足度を実現",
      animationDelay: "0s"
    },
    {
      iconClass: "fas fa-chart-line",
      title: "診断／相談実績",
      value: "2,500+",
      description: "豊富な経験に基づく、あなたに最適な資金調達プランを提案",
      animationDelay: "0.5s"
    },
    {
      iconClass: "fas fa-clock",
      title: "スピード診断",
      value: "30秒",
      description: "診断完了から結果表示までわずか30秒。無駄なく次の一手へ導く",
      animationDelay: "1s"
    }
  ]
};

export const defaultFirstConsultationOffer: FirstConsultationOffer = {
  title: "診断完了特典",
  description: "資金調達必勝バイブル（通常価格2,980円）を無料プレゼント中",
  icon: "fas fa-gift",
  backgroundColor: "rgba(212, 175, 55, 0.1)",
  borderColor: "var(--accent-gold)"
};

// デフォルトヘッダー情報
export const defaultHeaderData: HeaderData = {
  title: "タスカル",
  subtitle: "資金調達力診断"
};

// デフォルトメインビジュアルメッセージ
export const defaultMainVisualData: MainVisualData = {
  title: "30秒であなたの\n資金調達力をチェック！",
  highlightWord: "資金調達力",
  subtitle: "キャッシング・ファクタリング業者調査の前に自分の実力を把握しよう"
};

// デフォルトフッター情報
export const defaultFooterData: FooterData = {
  siteName: "タスカル",
  description: "30秒であなたの資金調達力をチェック！",
  companyInfo: "運営会社：タスカル株式会社",
  contactInfo: "お問い合わせ：support@taskal.jp",
  copyright: "タスカル. All rights reserved."
};

// デフォルトCTAボタン設定
export const defaultCTAButtonConfig: CTAButtonConfig = {
  button_text: "無料診断を開始する",
  button_type: "scroll_to_diagnosis",
  button_url: "",
  phone_number: "0120-999-888",
  phone_hours: "平日9:00-18:00",
  button_style: {
    bg_color: "from-blue-500 to-blue-600",
    hover_color: "from-blue-600 to-blue-700",
    text_color: "text-white",
    icon: "fas fa-comments"
  }
}; 