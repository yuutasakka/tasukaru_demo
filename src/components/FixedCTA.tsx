import React, { useState, useEffect } from 'react';

interface FixedCTAProps {
  onStartDiagnosis: () => void;
  isVisible?: boolean;
}

const FixedCTA: React.FC<FixedCTAProps> = ({ onStartDiagnosis, isVisible = true }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // スクロール量が200px以上で表示
      setIsScrolled(window.scrollY > 200);
    };

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    
    // 初回チェック
    handleScroll();
    handleResize();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  if (!isVisible || !isScrolled) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: isMobile ? '20px' : '40px',
        right: isMobile ? '20px' : '40px',
        zIndex: 1000,
        animation: 'slideUp 0.3s ease-out'
      }}
    >
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        .fixed-cta-button {
          animation: pulse 2s ease-in-out infinite;
        }

        .fixed-cta-button:hover {
          animation: none;
          transform: scale(1.1);
        }
      `}</style>
      
      <button
        onClick={onStartDiagnosis}
        className="fixed-cta-button"
        style={{
          background: 'linear-gradient(135deg, #ff6b35 0%, #f35627 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '9999px',
          padding: isMobile ? '1rem 2rem' : '1.25rem 3rem',
          fontSize: isMobile ? '0.875rem' : '1rem',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 10px 40px rgba(255, 107, 53, 0.6)',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          whiteSpace: 'nowrap'
        }}
        aria-label="無料診断を始める"
      >
        <span>無料診断を始める</span>
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 20 20" 
          fill="none"
          style={{ transform: 'rotate(-45deg)' }}
        >
          <path 
            d="M10 4L10 16M10 4L6 8M10 4L14 8" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* モバイル用のテキスト */}
      {isMobile && (
        <div style={{
          position: 'absolute',
          top: '-25px',
          right: '0',
          background: '#243b53',
          color: 'white',
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
        }}>
          3分で完了！
        </div>
      )}
    </div>
  );
};

export default FixedCTA;