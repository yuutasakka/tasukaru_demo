import React, { useEffect } from 'react';
import { useDesignTemplate } from '../contexts/DesignSettingsContext';

interface TemplateStyleProviderProps {
  children: React.ReactNode;
}

const TemplateStyleProvider: React.FC<TemplateStyleProviderProps> = ({ children }) => {
  const { currentTemplate, templateConfig } = useDesignTemplate();

  useEffect(() => {
    if (!templateConfig) return;

    // CSSカスタムプロパティを動的に設定
    const root = document.documentElement;
    
    // カラー設定
    root.style.setProperty('--template-primary', templateConfig.styles.colors.primary);
    root.style.setProperty('--template-secondary', templateConfig.styles.colors.secondary);
    root.style.setProperty('--template-accent', templateConfig.styles.colors.accent);
    root.style.setProperty('--template-background', templateConfig.styles.colors.background);
    root.style.setProperty('--template-text', templateConfig.styles.colors.text);
    root.style.setProperty('--template-border', templateConfig.styles.colors.border);
    
    // タイポグラフィ設定
    root.style.setProperty('--template-heading-font', templateConfig.styles.typography.headingFont);
    root.style.setProperty('--template-body-font', templateConfig.styles.typography.bodyFont);
    
    // フォントサイズスケール（レスポンシブ対応）
    const fontScale = {
      small: { 
        base: 'clamp(0.875rem, 0.8rem + 0.375vw, 1rem)', 
        heading: 'clamp(1.125rem, 1rem + 0.625vw, 1.5rem)' 
      },
      medium: { 
        base: 'clamp(1rem, 0.9rem + 0.5vw, 1.125rem)', 
        heading: 'clamp(1.5rem, 1.3rem + 1vw, 2rem)' 
      },
      large: { 
        base: 'clamp(1.125rem, 1rem + 0.625vw, 1.25rem)', 
        heading: 'clamp(1.75rem, 1.5rem + 1.25vw, 2.5rem)' 
      }
    };
    root.style.setProperty('--template-font-size-base', fontScale[templateConfig.styles.typography.scale].base);
    root.style.setProperty('--template-font-size-heading', fontScale[templateConfig.styles.typography.scale].heading);
    
    // ボタンスタイル
    root.style.setProperty('--template-button-radius', 
      templateConfig.styles.buttons.style === 'rounded' ? '0.5rem' :
      templateConfig.styles.buttons.style === 'pill' ? '9999px' :
      templateConfig.styles.buttons.style === 'square' ? '0' : '0'
    );
    
    // セクションスペーシング（レスポンシブ対応）
    const spacing = {
      compact: 'clamp(1.5rem, 4vw, 2rem)',
      normal: 'clamp(2.5rem, 6vw, 4rem)',
      spacious: 'clamp(3rem, 8vw, 6rem)'
    };
    root.style.setProperty('--template-section-spacing', spacing[templateConfig.styles.sections.spacing]);
    
    // ヘッダー高さ
    root.style.setProperty('--template-header-height', templateConfig.styles.header.height);
    
    // テンプレート固有のクラスをbodyに追加
    document.body.className = `template-${currentTemplate}`;
    
  }, [currentTemplate, templateConfig]);

  // テンプレート固有のグローバルスタイル
  const templateStyles = templateConfig ? `
    /* グローバルテンプレートスタイル */
    body.template-${currentTemplate} {
      font-family: var(--template-body-font), sans-serif;
      font-size: var(--template-font-size-base);
      color: var(--template-text);
      background-color: var(--template-background);
    }
    
    body.template-${currentTemplate} h1,
    body.template-${currentTemplate} h2,
    body.template-${currentTemplate} h3,
    body.template-${currentTemplate} h4,
    body.template-${currentTemplate} h5,
    body.template-${currentTemplate} h6 {
      font-family: var(--template-heading-font), sans-serif;
    }
    
    /* ヘッダースタイル */
    body.template-${currentTemplate} .app-header {
      background-color: ${templateConfig.styles.header.backgroundColor};
      color: ${templateConfig.styles.header.textColor};
      height: var(--template-header-height);
    }
    
    body.template-${currentTemplate} .app-header.layout-${templateConfig.styles.header.layout} {
      ${templateConfig.styles.header.layout === 'centered' ? 'text-align: center;' : ''}
      ${templateConfig.styles.header.layout === 'vertical' ? 'flex-direction: column;' : ''}
    }
    
    /* ボタンスタイル（レスポンシブ対応） */
    body.template-${currentTemplate} .premium-button,
    body.template-${currentTemplate} button[type="button"] {
      border-radius: var(--template-button-radius);
      ${templateConfig.styles.buttons.size === 'small' ? 'padding: clamp(0.375rem, 1vw, 0.5rem) clamp(0.75rem, 2vw, 1rem); font-size: clamp(0.75rem, 2vw, 0.875rem);' : ''}
      ${templateConfig.styles.buttons.size === 'medium' ? 'padding: clamp(0.5rem, 1.5vw, 0.75rem) clamp(1rem, 3vw, 1.5rem); font-size: clamp(0.875rem, 2.5vw, 1rem);' : ''}
      ${templateConfig.styles.buttons.size === 'large' ? 'padding: clamp(0.75rem, 2vw, 1rem) clamp(1.5rem, 4vw, 2rem); font-size: clamp(1rem, 3vw, 1.125rem);' : ''}
    }
    
    /* セクションレイアウト */
    body.template-${currentTemplate} section {
      padding-top: var(--template-section-spacing);
      padding-bottom: var(--template-section-spacing);
    }
    
    /* カードスタイル */
    body.template-${currentTemplate} .stats-card,
    body.template-${currentTemplate} .testimonial-card {
      ${templateConfig.styles.sections.borderStyle === 'none' ? 'border: none; box-shadow: none;' : ''}
      ${templateConfig.styles.sections.borderStyle === 'solid' ? 'border: 2px solid var(--template-border);' : ''}
      ${templateConfig.styles.sections.borderStyle === 'shadow' ? 'box-shadow: 0 4px 12px rgba(0,0,0,0.1);' : ''}
      ${templateConfig.styles.sections.borderStyle === 'gradient' ? 'background: linear-gradient(135deg, var(--template-background) 0%, var(--template-secondary) 100%);' : ''}
    }
    
    /* アニメーション */
    ${templateConfig.styles.buttons.animation === 'hover-scale' ? `
    body.template-${currentTemplate} button:hover {
      transform: scale(1.05);
      transition: transform 0.2s ease;
    }` : ''}
    
    ${templateConfig.styles.buttons.animation === 'hover-glow' ? `
    body.template-${currentTemplate} button:hover {
      box-shadow: 0 0 20px rgba(var(--template-accent-rgb), 0.5);
      transition: box-shadow 0.3s ease;
    }` : ''}
    
    ${templateConfig.styles.buttons.animation === 'hover-slide' ? `
    body.template-${currentTemplate} button {
      position: relative;
      overflow: hidden;
    }
    body.template-${currentTemplate} button::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: rgba(255,255,255,0.3);
      transition: left 0.3s ease;
    }
    body.template-${currentTemplate} button:hover::before {
      left: 0;
    }` : ''}
    
    /* テンプレート固有の調整 */
    ${currentTemplate === 'minimal' ? `
    body.template-minimal * {
      border-radius: 0 !important;
    }
    body.template-minimal .luxury-input,
    body.template-minimal .luxury-select {
      border-bottom: 1px solid var(--template-border);
      border-top: none;
      border-left: none;
      border-right: none;
    }` : ''}
    
    ${currentTemplate === 'creative' ? `
    body.template-creative section:nth-child(odd) {
      background: linear-gradient(135deg, var(--template-background) 0%, rgba(124, 58, 237, 0.05) 100%);
    }` : ''}
    
    /* レスポンシブメディアクエリ */
    @media (max-width: 768px) {
      body.template-${currentTemplate} section {
        padding-left: 1rem;
        padding-right: 1rem;
      }
      
      body.template-${currentTemplate} .stats-card {
        padding: 1.5rem;
      }
      
      body.template-${currentTemplate} .testimonial-card {
        padding: 1rem;
      }
    }
    
    @media (max-width: 480px) {
      body.template-${currentTemplate} h1 {
        font-size: clamp(1.5rem, 6vw, 2rem);
      }
      
      body.template-${currentTemplate} h2 {
        font-size: clamp(1.25rem, 5vw, 1.75rem);
      }
      
      body.template-${currentTemplate} h3 {
        font-size: clamp(1.125rem, 4vw, 1.5rem);
      }
    }
  ` : '';

  return (
    <>
      <style>{templateStyles}</style>
      {children}
    </>
  );
};

export default TemplateStyleProvider;