import React from 'react';

interface FooterProps {
  onNavigateToAdminLogin: () => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigateToAdminLogin }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{
      backgroundColor: '#333333',
      color: '#FFFFFF',
      padding: '60px 20px 40px',
      marginTop: '80px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* ロゴとサービス名 */}
        <div style={{
          textAlign: 'center',
          marginBottom: '48px'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            {/* ロゴアイコン */}
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#3174F3',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path 
                  d="M12 2L2 7V12C2 16.5 4.5 20.5 12 22C19.5 20.5 22 16.5 22 12V7L12 2Z" 
                  stroke="#FFFFFF" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
                <path 
                  d="M9 12L11 14L15 10" 
                  stroke="#FFFFFF" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 style={{
              fontSize: '24px',
              fontWeight: 700,
              margin: 0
            }}>
              タスカル
            </h3>
          </div>
          <p style={{
            fontSize: '16px',
            color: '#CCCCCC',
            lineHeight: 1.6,
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            30秒で分かる資金調達力診断
          </p>
        </div>

        {/* リンクとナビゲーション */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '40px',
          marginBottom: '48px',
          textAlign: 'center'
        }}>
          {/* サービス */}
          <div>
            <h4 style={{
              fontSize: '16px',
              fontWeight: 700,
              marginBottom: '20px',
              color: '#FFFFFF'
            }}>
              サービス
            </h4>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <li>
                <a 
                  href="#diagnosis-form-section"
                  style={{
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#3174F3'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#FFFFFF'}
                >
                  無料診断
                </a>
              </li>
              <li>
                <a 
                  href="#features"
                  style={{
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#3174F3'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#FFFFFF'}
                >
                  診断の特徴
                </a>
              </li>
              <li>
                <a 
                  href="#faq"
                  style={{
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#3174F3'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#FFFFFF'}
                >
                  よくある質問
                </a>
              </li>
            </ul>
          </div>

          {/* 会社情報 */}
          <div>
            <h4 style={{
              fontSize: '16px',
              fontWeight: 700,
              marginBottom: '20px',
              color: '#FFFFFF'
            }}>
              会社情報
            </h4>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <li>
                <a 
                  href="#company"
                  style={{
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#3174F3'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#FFFFFF'}
                >
                  会社概要
                </a>
              </li>
              <li>
                <a 
                  href="#contact"
                  style={{
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#3174F3'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#FFFFFF'}
                >
                  お問い合わせ
                </a>
              </li>
            </ul>
          </div>

          {/* 法的情報 */}
          <div>
            <h4 style={{
              fontSize: '16px',
              fontWeight: 700,
              marginBottom: '20px',
              color: '#FFFFFF'
            }}>
              法的情報
            </h4>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <li>
                <a 
                  href="#privacy"
                  style={{
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#3174F3'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#FFFFFF'}
                >
                  プライバシーポリシー
                </a>
              </li>
              <li>
                <a 
                  href="#terms"
                  style={{
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#3174F3'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#FFFFFF'}
                >
                  利用規約
                </a>
              </li>
              <li>
                <a 
                  href="#scta"
                  style={{
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#3174F3'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#FFFFFF'}
                >
                  特定商取引法に基づく表記
                </a>
              </li>
            </ul>
          </div>

          {/* その他 */}
          <div>
            <h4 style={{
              fontSize: '16px',
              fontWeight: 700,
              marginBottom: '20px',
              color: '#FFFFFF'
            }}>
              その他
            </h4>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <li>
                <a 
                  href="#admin"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigateToAdminLogin();
                  }}
                  style={{
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'color 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#3174F3'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#FFFFFF'}
                >
                  管理者ログイン
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* 下線 */}
        <div style={{
          borderTop: '1px solid #555555',
          paddingTop: '32px',
          textAlign: 'center'
        }}>
          {/* コピーライト */}
          <p style={{
            fontSize: '14px',
            color: '#999999',
            margin: 0
          }}>
            © {currentYear} タスカル Inc. All rights reserved.
          </p>
        </div>
      </div>

      {/* モバイルレスポンシブ */}
      <style>{`
        @media (max-width: 768px) {
          footer > div {
            padding: 0 16px;
          }
          
          footer h3 {
            font-size: 20px !important;
          }
          
          footer .grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 24px !important;
            text-align: left !important;
          }
        }
        
        @media (max-width: 480px) {
          footer .grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
};

export default Footer;