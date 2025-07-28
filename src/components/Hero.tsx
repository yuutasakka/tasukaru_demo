import React, { useEffect, useState } from 'react';

interface HeroProps {
  onStartDiagnosis: () => void;
}

const Hero: React.FC<HeroProps> = ({ onStartDiagnosis }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      paddingTop: '80px'
    }}>
      {/* 背景パターン */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232C3E50' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        opacity: 0.3
      }} />

      {/* 装飾的な円 */}
      <div style={{
        position: 'absolute',
        top: '-100px',
        right: '-100px',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(44, 62, 80, 0.05) 0%, transparent 70%)',
        animation: 'float 6s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-150px',
        left: '-150px',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(243, 156, 18, 0.05) 0%, transparent 70%)',
        animation: 'float 8s ease-in-out infinite reverse'
      }} />

      <div className="container" style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 16px',
        textAlign: 'center'
      }}>
        {/* メインコンテンツ */}
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.8s ease-out'
        }}>
          {/* バッジ */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#2C3E50',
            borderRadius: '999px',
            marginBottom: '24px'
          }}>
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              backgroundColor: '#FFFFFF',
              borderRadius: '50%',
              animation: 'pulse 2s ease-in-out infinite'
            }} />
            <span style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#FFFFFF'
            }}>
              30秒で診断完了
            </span>
          </div>

          {/* キャッチコピー */}
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 700,
            color: '#2C3E50',
            lineHeight: 1.2,
            marginBottom: '24px',
            letterSpacing: '-0.02em'
          }}>
            あなたの
            <span style={{
              color: '#F39C12',
              display: 'inline-block',
              animation: 'highlight 2s ease-in-out infinite'
            }}>
              "資金調達力"
            </span>
            <br />
            をチェック！
          </h1>

          {/* サブテキスト */}
          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.25rem)',
            color: '#34495E',
            lineHeight: 1.6,
            marginBottom: '32px',
            maxWidth: '600px',
            margin: '0 auto 32px'
          }}>
            先に資金調達力を把握してから、<br className="desktop-break" />
            キャッシング・ファクタリングの業者調査へ
          </p>

          {/* 追加説明 */}
          <p style={{
            fontSize: 'clamp(0.875rem, 1.5vw, 1rem)',
            color: '#7F8C8D',
            lineHeight: 1.6,
            marginBottom: '24px'
          }}>
            調査前に"自分の資金調達力"を理解すれば、<br />
            無駄なく最適なサービスが選べる！
          </p>

          {/* CTA セクション */}
          <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12">
            <button
              onClick={onStartDiagnosis}
              className="btn-accent btn-pulse"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, rgb(231, 76, 60) 0%, rgb(192, 57, 43) 100%)',
                color: 'white',
                padding: '20px 48px',
                borderRadius: '12px',
                boxShadow: 'rgba(231, 76, 60, 0.3) 0px 4px 15px',
                animation: '2s ease 0s infinite normal none running pulse',
                border: 'none',
                cursor: 'pointer',
                transition: '0.3s',
                fontSize: '18px',
                fontWeight: 700,
                minWidth: '280px',
                height: '64px'
              }}
            >
              <div className="flex items-center space-x-3">
                <i className="fas fa-gift text-yellow-300 text-xl animate-bounce"></i>
                <div>
                  <p className="font-bold text-sm leading-tight">30秒診断完了者限定！</p>
                  <p className="text-xs font-semibold">資金調達バイブル完全版を無料プレゼント！</p>
                </div>
              </div>
            </button>
            
            <button
              onClick={onStartDiagnosis}
              className="btn-accent btn-pulse"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                padding: '20px 48px',
                fontSize: '18px',
                fontWeight: 700,
                backgroundColor: 'rgb(44, 62, 80)',
                color: 'rgb(255, 255, 255)',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: '0.3s',
                boxShadow: 'rgba(44, 62, 80, 0.25) 0px 4px 16px',
                position: 'relative',
                overflow: 'hidden',
                transform: 'translateY(0px)',
                minWidth: '280px',
                height: '64px'
              }}
            >
              無料診断を開始する
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7 5L12 10L7 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* 信頼性指標 */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '32px',
            marginTop: '64px',
            flexWrap: 'wrap'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#34495E',
              fontSize: '14px'
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L12.5 7.5L18 8L14 12L15 18L10 15.5L5 18L6 12L2 8L7.5 7.5L10 2Z" fill="#F39C12" stroke="#F39C12" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
              <span>5万人以上が診断</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#34495E',
              fontSize: '14px'
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 1C14.9706 1 19 5.02944 19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1Z" stroke="#2C3E50" strokeWidth="1.5"/>
                <path d="M7 10L9 12L13 8" stroke="#2C3E50" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>完全無料・匿名OK</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#34495E',
              fontSize: '14px'
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2V10L14 14" stroke="#27AE60" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="10" cy="10" r="9" stroke="#27AE60" strokeWidth="1.5"/>
              </svg>
              <span>30秒で結果表示</span>
            </div>
          </div>
        </div>

        {/* 戦闘力イラスト */}
        <div style={{
          position: 'absolute',
          bottom: '-100px',
          right: '10%',
          opacity: 0.1,
          pointerEvents: 'none'
        }}>
          <svg width="300" height="300" viewBox="0 0 300 300" fill="none">
            <circle cx="150" cy="150" r="100" stroke="#2C3E50" strokeWidth="2" strokeDasharray="5 5" opacity="0.3"/>
            <circle cx="150" cy="150" r="70" stroke="#F39C12" strokeWidth="2" strokeDasharray="5 5" opacity="0.3"/>
            <circle cx="150" cy="150" r="40" stroke="#27AE60" strokeWidth="2" strokeDasharray="5 5" opacity="0.3"/>
          </svg>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes highlight {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .btn-pulse {
          animation: pulse 2s ease-in-out infinite;
        }

        @media (max-width: 768px) {
          .mobile-only {
            display: block;
          }
          .desktop-break {
            display: none;
          }
        }

        @media (min-width: 769px) {
          .mobile-only {
            display: none;
          }
          .desktop-break {
            display: block;
          }
        }
      `}</style>
    </section>
  );
};

export default Hero;