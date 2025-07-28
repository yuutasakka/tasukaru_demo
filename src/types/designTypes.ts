// デザインテンプレートの型定義

export type DesignTemplate = 'modern' | 'classic' | 'minimal' | 'corporate' | 'creative';

export interface DesignTemplateConfig {
  templateId: DesignTemplate;
  name: string;
  description: string;
  preview: string;
  styles: {
    // ヘッダーのスタイル
    header: {
      layout: 'horizontal' | 'vertical' | 'centered';
      backgroundColor: string;
      textColor: string;
      height: string;
      logoPosition: 'left' | 'center' | 'right';
      menuStyle: 'inline' | 'dropdown' | 'hamburger';
    };
    // メインビジュアルのスタイル
    mainVisual: {
      layout: 'hero' | 'split' | 'fullscreen' | 'carousel';
      textAlignment: 'left' | 'center' | 'right';
      overlayOpacity: number;
      animationType: 'fade' | 'slide' | 'zoom' | 'none';
    };
    // セクションのスタイル
    sections: {
      layout: 'cards' | 'list' | 'grid' | 'timeline';
      spacing: 'compact' | 'normal' | 'spacious';
      borderStyle: 'none' | 'solid' | 'shadow' | 'gradient';
    };
    // ボタンのスタイル
    buttons: {
      style: 'rounded' | 'square' | 'pill' | 'ghost';
      size: 'small' | 'medium' | 'large';
      animation: 'none' | 'hover-scale' | 'hover-glow' | 'hover-slide';
    };
    // タイポグラフィ
    typography: {
      headingFont: string;
      bodyFont: string;
      scale: 'small' | 'medium' | 'large';
    };
    // カラーパレット
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      text: string;
      border: string;
    };
  };
  components: {
    // コンポーネントの表示/非表示
    showTestimonials: boolean;
    showStatistics: boolean;
    showFAQ: boolean;
    showContactForm: boolean;
    // コンポーネントの順序
    componentOrder: string[];
  };
}

// プリセットテンプレート
export const designTemplates: Record<DesignTemplate, DesignTemplateConfig> = {
  modern: {
    templateId: 'modern',
    name: 'モダン',
    description: 'クリーンで洗練されたモダンなデザイン',
    preview: '/templates/modern-preview.png',
    styles: {
      header: {
        layout: 'horizontal',
        backgroundColor: '#ffffff',
        textColor: '#1e40af',
        height: '80px',
        logoPosition: 'left',
        menuStyle: 'inline'
      },
      mainVisual: {
        layout: 'hero',
        textAlignment: 'center',
        overlayOpacity: 0.3,
        animationType: 'fade'
      },
      sections: {
        layout: 'cards',
        spacing: 'normal',
        borderStyle: 'shadow'
      },
      buttons: {
        style: 'rounded',
        size: 'medium',
        animation: 'hover-scale'
      },
      typography: {
        headingFont: 'Noto Sans JP',
        bodyFont: 'Noto Sans JP',
        scale: 'medium'
      },
      colors: {
        primary: '#1e40af',
        secondary: '#3b82f6',
        accent: '#fbbf24',
        background: '#f5f5f5',
        text: '#111827',
        border: '#e5e7eb'
      }
    },
    components: {
      showTestimonials: true,
      showStatistics: true,
      showFAQ: false,
      showContactForm: true,
      componentOrder: ['hero', 'features', 'testimonials', 'statistics', 'cta']
    }
  },
  classic: {
    templateId: 'classic',
    name: 'クラシック',
    description: '信頼感のある伝統的なデザイン',
    preview: '/templates/classic-preview.png',
    styles: {
      header: {
        layout: 'centered',
        backgroundColor: '#1f2937',
        textColor: '#ffffff',
        height: '100px',
        logoPosition: 'center',
        menuStyle: 'dropdown'
      },
      mainVisual: {
        layout: 'split',
        textAlignment: 'left',
        overlayOpacity: 0.5,
        animationType: 'none'
      },
      sections: {
        layout: 'list',
        spacing: 'spacious',
        borderStyle: 'solid'
      },
      buttons: {
        style: 'square',
        size: 'large',
        animation: 'none'
      },
      typography: {
        headingFont: 'Mincho',
        bodyFont: 'Gothic',
        scale: 'large'
      },
      colors: {
        primary: '#1f2937',
        secondary: '#4b5563',
        accent: '#dc2626',
        background: '#ffffff',
        text: '#1f2937',
        border: '#d1d5db'
      }
    },
    components: {
      showTestimonials: true,
      showStatistics: false,
      showFAQ: true,
      showContactForm: true,
      componentOrder: ['hero', 'features', 'faq', 'testimonials', 'cta']
    }
  },
  minimal: {
    templateId: 'minimal',
    name: 'ミニマル',
    description: 'シンプルで洗練されたミニマルデザイン',
    preview: '/templates/minimal-preview.png',
    styles: {
      header: {
        layout: 'horizontal',
        backgroundColor: 'transparent',
        textColor: '#000000',
        height: '60px',
        logoPosition: 'left',
        menuStyle: 'hamburger'
      },
      mainVisual: {
        layout: 'fullscreen',
        textAlignment: 'center',
        overlayOpacity: 0,
        animationType: 'zoom'
      },
      sections: {
        layout: 'grid',
        spacing: 'spacious',
        borderStyle: 'none'
      },
      buttons: {
        style: 'ghost',
        size: 'small',
        animation: 'hover-glow'
      },
      typography: {
        headingFont: 'Helvetica',
        bodyFont: 'Helvetica',
        scale: 'small'
      },
      colors: {
        primary: '#000000',
        secondary: '#6b7280',
        accent: '#ef4444',
        background: '#fafafa',
        text: '#000000',
        border: '#000000'
      }
    },
    components: {
      showTestimonials: false,
      showStatistics: false,
      showFAQ: false,
      showContactForm: false,
      componentOrder: ['hero', 'features', 'cta']
    }
  },
  corporate: {
    templateId: 'corporate',
    name: 'コーポレート',
    description: 'ビジネス向けの信頼感あるデザイン',
    preview: '/templates/corporate-preview.png',
    styles: {
      header: {
        layout: 'horizontal',
        backgroundColor: '#0f172a',
        textColor: '#ffffff',
        height: '90px',
        logoPosition: 'left',
        menuStyle: 'inline'
      },
      mainVisual: {
        layout: 'carousel',
        textAlignment: 'left',
        overlayOpacity: 0.4,
        animationType: 'slide'
      },
      sections: {
        layout: 'timeline',
        spacing: 'normal',
        borderStyle: 'gradient'
      },
      buttons: {
        style: 'rounded',
        size: 'large',
        animation: 'hover-slide'
      },
      typography: {
        headingFont: 'Yu Gothic',
        bodyFont: 'Meiryo',
        scale: 'medium'
      },
      colors: {
        primary: '#0f172a',
        secondary: '#1e293b',
        accent: '#0ea5e9',
        background: '#f8fafc',
        text: '#0f172a',
        border: '#cbd5e1'
      }
    },
    components: {
      showTestimonials: true,
      showStatistics: true,
      showFAQ: true,
      showContactForm: true,
      componentOrder: ['hero', 'statistics', 'features', 'testimonials', 'faq', 'cta']
    }
  },
  creative: {
    templateId: 'creative',
    name: 'クリエイティブ',
    description: '個性的で印象的なデザイン',
    preview: '/templates/creative-preview.png',
    styles: {
      header: {
        layout: 'vertical',
        backgroundColor: '#7c3aed',
        textColor: '#ffffff',
        height: '120px',
        logoPosition: 'center',
        menuStyle: 'hamburger'
      },
      mainVisual: {
        layout: 'hero',
        textAlignment: 'right',
        overlayOpacity: 0.2,
        animationType: 'slide'
      },
      sections: {
        layout: 'cards',
        spacing: 'compact',
        borderStyle: 'shadow'
      },
      buttons: {
        style: 'pill',
        size: 'medium',
        animation: 'hover-scale'
      },
      typography: {
        headingFont: 'Rounded Mplus',
        bodyFont: 'Noto Sans JP',
        scale: 'large'
      },
      colors: {
        primary: '#7c3aed',
        secondary: '#a78bfa',
        accent: '#f59e0b',
        background: '#faf5ff',
        text: '#1f2937',
        border: '#e9d5ff'
      }
    },
    components: {
      showTestimonials: true,
      showStatistics: false,
      showFAQ: false,
      showContactForm: true,
      componentOrder: ['hero', 'features', 'testimonials', 'cta']
    }
  }
};