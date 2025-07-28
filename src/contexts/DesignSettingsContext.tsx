import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';
import ProductionLogger from '../utils/productionLogger';
import { DesignTemplate, DesignTemplateConfig, designTemplates } from '../types/designTypes';
import { 
  HeaderData, 
  MainVisualData, 
  FooterData, 
  ReasonsToChooseData, 
  FirstConsultationOffer, 
  CTAButtonConfig 
} from '../../data/homepageContentData';

// Supabase設定の取得
const getSupabaseConfig = () => {
  if (typeof window !== 'undefined') {
    const url = (import.meta as any).env?.VITE_SUPABASE_URL || '';
    const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
    return { url, key };
  }
  return {
    url: process.env.VITE_SUPABASE_URL || '',
    key: process.env.VITE_SUPABASE_ANON_KEY || ''
  };
};

// 型定義はhomepageContentData.tsからインポートされます

interface DesignSettings {
  headerData: HeaderData | null;
  mainVisualData: MainVisualData | null;
  footerData: FooterData | null;
  reasonsToChoose: ReasonsToChooseData | null;
  firstConsultationOffer: FirstConsultationOffer | null;
  ctaButtonConfig: CTAButtonConfig | null;
  currentTemplate: DesignTemplate | null;
  templateConfig: DesignTemplateConfig | null;
  isLoading: boolean;
  error: string | null;
}

interface DesignSettingsContextType extends DesignSettings {
  refreshSettings: () => Promise<void>;
  setDesignTemplate: (templateId: DesignTemplate) => Promise<void>;
}

// Context作成
const DesignSettingsContext = createContext<DesignSettingsContextType | undefined>(undefined);

// Provider作成
export const DesignSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<DesignSettings>({
    headerData: null,
    mainVisualData: null,
    footerData: null,
    reasonsToChoose: null,
    firstConsultationOffer: null,
    ctaButtonConfig: null,
    currentTemplate: null,
    templateConfig: null,
    isLoading: true,
    error: null
  });

  const supabaseConfig = getSupabaseConfig();
  // Supabase設定が不完全な場合はnullクライアントを使用
  const supabase = (supabaseConfig.key && supabaseConfig.url) 
    ? createClient(supabaseConfig.url, supabaseConfig.key)
    : null;

  // 設定を取得する関数
  const fetchSettings = async () => {
    try {
      setSettings(prev => ({ ...prev, isLoading: true, error: null }));

      // Supabaseが利用できない場合は空の設定で続行
      if (!supabase) {
        setSettings(prev => ({ 
          ...prev, 
          isLoading: false,
          error: 'Supabase not configured'
        }));
        return;
      }

      // すべての設定を一度に取得
      const { data, error } = await supabase
        .from('homepage_content_settings')
        .select('*')
        .in('setting_key', [
          'header_data',
          'main_visual_data',
          'footer_data',
          'reasons_to_choose',
          'first_consultation_offer',
          'cta_button_config',
          'design_template'
        ]);

      if (error) throw error;

      // データを整形してステートに設定
      const newSettings: Partial<DesignSettings> = {};
      
      data?.forEach(item => {
        const settingData = item.setting_data;
        switch (item.setting_key) {
          case 'header_data':
            newSettings.headerData = settingData;
            break;
          case 'main_visual_data':
            newSettings.mainVisualData = settingData;
            break;
          case 'footer_data':
            newSettings.footerData = settingData;
            break;
          case 'reasons_to_choose':
            newSettings.reasonsToChoose = settingData;
            break;
          case 'first_consultation_offer':
            newSettings.firstConsultationOffer = settingData;
            break;
          case 'cta_button_config':
            newSettings.ctaButtonConfig = settingData;
            break;
          case 'design_template':
            newSettings.currentTemplate = settingData as DesignTemplate;
            newSettings.templateConfig = designTemplates[settingData as DesignTemplate];
            break;
        }
      });

      setSettings(prev => ({
        ...prev,
        ...newSettings,
        isLoading: false
      }));

      // セッションストレージにバックアップ
      sessionStorage.setItem('designSettings', JSON.stringify(newSettings));
      ProductionLogger.info('デザイン設定を取得・更新しました');

    } catch (error) {
      ProductionLogger.error('デザイン設定の取得エラー:', error as Error);
      
      // エラー時はセッションストレージから復元を試みる
      try {
        const cachedSettings = sessionStorage.getItem('designSettings');
        if (cachedSettings) {
          const parsed = JSON.parse(cachedSettings);
          setSettings(prev => ({
            ...prev,
            ...parsed,
            isLoading: false,
            error: 'Supabaseから取得できませんでした。キャッシュデータを使用しています。'
          }));
        } else {
          setSettings(prev => ({
            ...prev,
            isLoading: false,
            error: 'デザイン設定の取得に失敗しました。'
          }));
        }
      } catch (cacheError) {
        setSettings(prev => ({
          ...prev,
          isLoading: false,
          error: 'デザイン設定の取得に失敗しました。'
        }));
      }
    }
  };

  // リアルタイム購読のセットアップ
  useEffect(() => {
    // 初回取得
    fetchSettings();

    // Supabaseが利用できない場合はリアルタイム購読をスキップ
    if (!supabase) {
      return;
    }

    // リアルタイム購読を設定
    const channel = supabase
      .channel('design-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'homepage_content_settings',
          filter: `setting_key=in.(header_data,main_visual_data,footer_data,reasons_to_choose,first_consultation_offer,cta_button_config,design_template)`
        },
        (payload) => {
          ProductionLogger.info('デザイン設定の変更を検出:', payload);
          
          // 変更されたデータを即座に反映
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newRecord = payload.new as any;
            const settingKey = newRecord.setting_key;
            const settingData = newRecord.setting_data;

            setSettings(prev => {
              const updated = { ...prev };
              switch (settingKey) {
                case 'header_data':
                  updated.headerData = settingData;
                  break;
                case 'main_visual_data':
                  updated.mainVisualData = settingData;
                  break;
                case 'footer_data':
                  updated.footerData = settingData;
                  break;
                case 'reasons_to_choose':
                  updated.reasonsToChoose = settingData;
                  break;
                case 'first_consultation_offer':
                  updated.firstConsultationOffer = settingData;
                  break;
                case 'cta_button_config':
                  updated.ctaButtonConfig = settingData;
                  break;
                case 'design_template':
                  updated.currentTemplate = settingData as DesignTemplate;
                  updated.templateConfig = designTemplates[settingData as DesignTemplate];
                  break;
              }

              // 更新されたデータをセッションストレージにも保存
              const { isLoading, error, ...dataToCache } = updated;
              sessionStorage.setItem('designSettings', JSON.stringify(dataToCache));
              
              return updated;
            });
          }
        }
      )
      .subscribe();

    // クリーンアップ
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // テンプレート設定関数
  const setDesignTemplate = async (templateId: DesignTemplate) => {
    try {
      setSettings(prev => ({ ...prev, isLoading: true, error: null }));

      // Supabaseが利用可能な場合のみ保存
      if (supabase) {
        const { error } = await supabase
          .from('homepage_content_settings')
          .upsert({
            setting_key: 'design_template',
            setting_data: templateId,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      // ローカルステートを更新
      setSettings(prev => ({
        ...prev,
        currentTemplate: templateId,
        templateConfig: designTemplates[templateId],
        isLoading: false
      }));

      ProductionLogger.info(`デザインテンプレートを「${designTemplates[templateId].name}」に変更しました`);

    } catch (error) {
      ProductionLogger.error('デザインテンプレートの変更エラー:', error as Error);
      setSettings(prev => ({
        ...prev,
        isLoading: false,
        error: 'デザインテンプレートの変更に失敗しました。'
      }));
    }
  };

  const contextValue: DesignSettingsContextType = {
    ...settings,
    refreshSettings: fetchSettings,
    setDesignTemplate
  };

  return (
    <DesignSettingsContext.Provider value={contextValue}>
      {children}
    </DesignSettingsContext.Provider>
  );
};

// Hook作成
export const useDesignSettings = () => {
  const context = useContext(DesignSettingsContext);
  if (context === undefined) {
    throw new Error('useDesignSettings must be used within a DesignSettingsProvider');
  }
  return context;
};

// 個別のHooks（後方互換性のため）
export const useHeaderData = () => {
  const { headerData } = useDesignSettings();
  return headerData;
};

export const useMainVisualData = () => {
  const { mainVisualData } = useDesignSettings();
  return mainVisualData;
};

export const useFooterData = () => {
  const { footerData } = useDesignSettings();
  return footerData;
};

export const useReasonsToChoose = () => {
  const { reasonsToChoose } = useDesignSettings();
  
  // デフォルトデータをインポート（フォールバック用）
  const defaultReasonsToChooseData = {
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
        iconClass: "fas fa-trophy",
        title: "相談実績",
        value: "2,500+",
        description: "豊富な経験に基づく最適なご提案",
        animationDelay: "1s"
      }
    ]
  };
  
  // データベースから取得したデータがMoneyTicketを含む場合、デフォルトデータを使用
  if (reasonsToChoose?.title?.includes('MoneyTicket')) {
    return defaultReasonsToChooseData;
  }
  
  return reasonsToChoose || defaultReasonsToChooseData;
};

export const useFirstConsultationOffer = () => {
  const { firstConsultationOffer } = useDesignSettings();
  return firstConsultationOffer;
};

export const useCTAButtonConfig = () => {
  const { ctaButtonConfig } = useDesignSettings();
  return ctaButtonConfig;
};

export const useDesignTemplate = () => {
  const { currentTemplate, templateConfig, setDesignTemplate } = useDesignSettings();
  return { currentTemplate, templateConfig, setDesignTemplate };
};