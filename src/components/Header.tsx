import React, { useState } from 'react';

const Header: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const scrollToTop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToDiagnosis = () => {
    const diagnosisSection = document.getElementById('diagnosis-form-section');
    if (diagnosisSection) {
      const yOffset = -80;
      const elementPosition = diagnosisSection.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset + yOffset;
      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth'
      });
    }
  };

  return (
    <header className="header-new" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid #E5E7EB',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
        padding: '0 16px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* ロゴ */}
        <a 
          href="#top" 
          onClick={scrollToTop}
          style={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            color: '#333333'
          }}
        >
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#F39C12',
            margin: 0,
            letterSpacing: '-0.02em'
          }}>
            タスカル
          </h1>
        </a>

        {/* デスクトップナビゲーション */}
        <nav className="desktop-only" style={{
          display: 'none',
          alignItems: 'center',
          gap: '32px'
        }}>
          <a 
            href="#faq" 
            style={{
              color: '#333333',
              textDecoration: 'none',
              fontSize: '16px',
              fontWeight: 500,
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#3174F3'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#333333'}
          >
            FAQ
          </a>
          <a 
            href="#contact" 
            style={{
              color: '#333333',
              textDecoration: 'none',
              fontSize: '16px',
              fontWeight: 500,
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#3174F3'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#333333'}
          >
            お問い合わせ
          </a>
          <button
            onClick={scrollToDiagnosis}
            className="btn btn-accent"
            style={{
              padding: '10px 24px',
              fontSize: '16px',
              fontWeight: 700,
              backgroundColor: '#F5A623',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#E89100';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F5A623';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
            }}
          >
            診断開始
          </button>
        </nav>

        {/* モバイルメニューボタン */}
        <button
          className="mobile-only"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            width: '48px',
            height: '48px',
            padding: '12px',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '8px',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F7F9FC'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          aria-label="メニューを開く"
        >
          <span style={{
            display: 'block',
            width: '24px',
            height: '2px',
            backgroundColor: '#333333',
            marginBottom: '4px',
            transition: 'all 0.3s ease',
            transform: isMobileMenuOpen ? 'rotate(45deg) translateY(6px)' : 'none'
          }}></span>
          <span style={{
            display: 'block',
            width: '24px',
            height: '2px',
            backgroundColor: '#333333',
            marginBottom: '4px',
            transition: 'all 0.3s ease',
            opacity: isMobileMenuOpen ? 0 : 1
          }}></span>
          <span style={{
            display: 'block',
            width: '24px',
            height: '2px',
            backgroundColor: '#333333',
            transition: 'all 0.3s ease',
            transform: isMobileMenuOpen ? 'rotate(-45deg) translateY(-6px)' : 'none'
          }}></span>
        </button>
      </div>

      {/* モバイルメニュー */}
      {isMobileMenuOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          animation: 'slideDown 0.3s ease-out'
        }}>
          <nav style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '16px'
          }}>
            <a 
              href="#faq"
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                padding: '16px',
                color: '#333333',
                textDecoration: 'none',
                fontSize: '16px',
                fontWeight: 500,
                borderBottom: '1px solid #F7F9FC',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F7F9FC'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              FAQ
            </a>
            <a 
              href="#contact"
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                padding: '16px',
                color: '#333333',
                textDecoration: 'none',
                fontSize: '16px',
                fontWeight: 500,
                borderBottom: '1px solid #F7F9FC',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F7F9FC'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              お問い合わせ
            </a>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                scrollToDiagnosis();
              }}
              style={{
                margin: '16px 0 0 0',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 700,
                backgroundColor: '#F5A623',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E89100'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F5A623'}
            >
              無料診断を開始する
            </button>
          </nav>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (min-width: 768px) {
          .desktop-only {
            display: flex !important;
          }
          .mobile-only {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
};

export default Header;