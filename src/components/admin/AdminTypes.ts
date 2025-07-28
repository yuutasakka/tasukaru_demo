// 管理画面用のTypeScript型定義

export type AdminViewMode = 
  | 'userHistory' 
  | 'productSettings' 
  | 'testimonialSettings' 
  | 'analyticsSettings' 
  | 'notificationSettings' 
  | 'legalLinksSettings' 
  | 'adminSettings' 
  | 'homepageContentSettings' 
  | 'headerAndVisualSettings' 
  | 'colorThemeSettings' 
  | 'securitySettings' 
  | 'expertContactSettings' 
  | 'financialPlannersSettings';

export interface DashboardStats {
  totalDiagnoses: number;
  diagnosesLast7Days: number;
  averageInvestmentAmount: number;
  mostCommonPurpose: string;
  ageDistribution: Record<string, string>; // Store as percentage string
}

export interface AdminState {
  // View管理
  currentView: AdminViewMode;
  
  // エラー・成功メッセージ
  globalError: string;
  globalSuccess: string;
  globalLoading: boolean;
  
  // セッション管理
  sessionValid: boolean;
  sessionTimeRemaining: number;
  
  // 統計データ
  stats: DashboardStats;
}

export interface AdminMessageHandlers {
  handleError: (error: any, userMessage: string, logContext?: string) => void;
  showSuccess: (message: string) => void;
  clearMessages: () => void;
}

// Export Types from types.ts for convenience
export type { 
  UserSessionData, 
  FinancialProduct, 
  Company, 
  Testimonial, 
  NotificationSettings,
  EmailNotificationConfig,
  SlackNotificationConfig,
  LineNotificationConfig,
  ChatWorkNotificationConfig,
  LegalLink 
} from '@/types';

export type {
  ReasonsToChooseData,
  FirstConsultationOffer,
  HeaderData,
  MainVisualData,
  FooterData
} from '@/data/homepageContentData';