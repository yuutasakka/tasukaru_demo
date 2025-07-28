import React from 'react';
import { defaultFirstConsultationOffer, defaultCTAButtonConfig } from '../../data/homepageContentData';

const CallToActionSection: React.FC = () => {
  // 一時的にデフォルトデータを強制使用（キャッシング・ファクタリング対応）
  const consultationOffer = defaultFirstConsultationOffer;
  const ctaButtonConfig = defaultCTAButtonConfig;

  const handleCTAButtonClick = () => {
    switch (ctaButtonConfig.button_type) {
      case 'scroll_to_diagnosis':
        const diagnosisSection = document.getElementById('diagnosis-form-section');
        if (diagnosisSection) {
          diagnosisSection.scrollIntoView({ behavior: 'smooth' });
        }
        break;
      case 'external_url':
        if (ctaButtonConfig.button_url) {
          window.open(ctaButtonConfig.button_url, '_blank', 'noopener,noreferrer');
        }
        break;
      case 'phone_call':
        if (ctaButtonConfig.phone_number) {
          window.location.href = `tel:${ctaButtonConfig.phone_number}`;
        }
        break;
      default:
        // フォールバック: 診断セクションにスクロール
        const fallbackSection = document.getElementById('diagnosis-form-section');
        if (fallbackSection) {
          fallbackSection.scrollIntoView({ behavior: 'smooth' });
        }
    }
  };

  return (
    <section id="cta-section" className="py-16 px-4 text-center" style={{ background: '#FFFFFF' }}>
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.02);
          }
        }
        .animate-bounce {
          animation: bounce 1s infinite;
        }
        @keyframes bounce {
          0%, 100% {
            transform: translateY(-25%);
            animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
          }
          50% {
            transform: translateY(0);
            animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
          }
        }
      `}</style>
      <div className="max-w-4xl mx-auto">
        <h3 
          className="text-2xl md:text-4xl lg:text-5xl mb-6 font-bold leading-tight"
          style={{
            letterSpacing: '-0.02em',
            color: '#2C3E50'
          }}
        >
          急な資金ニーズ<br />
          <span style={{ color: '#F39C12' }}>今すぐ解決しませんか？</span>
        </h3>
        <p className="text-lg md:text-xl mb-8 leading-relaxed" style={{ color: '#34495E' }}>
            キャッシング・ファクタリングのプロが、あなたの収支状況や緊急度に合わせて<br />
            最適な資金調達プランを無料でご提案します。
        </p>
        
        <div className="space-y-6">
          {/* ボタンとプレゼント文言の横並びレイアウト */}
          <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12">
            <button
              type="button"
              onClick={handleCTAButtonClick}
              className="btn btn-gradient text-lg"
              style={{
                padding: '1rem 3rem',
                fontSize: '1.125rem',
                background: 'linear-gradient(135deg, #F39C12 0%, #D68910 100%)',
                minWidth: '280px',
                height: '64px'
              }}
            >
              {ctaButtonConfig.button_text}
            </button>
            
            {/* プレゼント文言 */}
            <div 
              className="text-white rounded-lg shadow-lg transform hover:scale-105 transition-transform duration-200"
              style={{
                background: 'linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)',
                boxShadow: '0 4px 15px rgba(231, 76, 60, 0.3)',
                animation: 'pulse 2s infinite',
                padding: '12px 20px',
                minWidth: '280px',
                height: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div className="flex items-center space-x-3">
                <i className="fas fa-gift text-yellow-300 text-lg animate-bounce"></i>
                <div>
                  <p className="font-bold text-sm leading-tight">
                    30秒診断完了者限定！
                  </p>
                  <p className="text-xs font-semibold">
                    資金調達バイブル完全版を無料プレゼント！
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-sm" style={{ color: '#7F8C8D' }}>
            お電話でのご相談：{ctaButtonConfig.phone_number || 'お問い合わせフォームをご利用ください'}（平日 9:00-18:00）
          </p>
        </div>
        
        <div 
          className="mt-10 p-6 md:p-8 rounded-2xl"
          style={{ 
            background: '#F8FAFC',
            border: '1px solid #ECF0F1',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}
        >
            <h4 className="font-bold mb-3 text-lg md:text-xl" style={{ color: '#2C3E50' }}>
                {consultationOffer.title}
            </h4>
            <p style={{ color: '#34495E' }}>
                {consultationOffer.description}
            </p>
        </div>
      </div>
    </section>
  );
};

export default CallToActionSection;