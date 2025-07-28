import React, { useState } from 'react';

interface DownloadGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  combatScore: number;
  rank: string;
  phoneNumber?: string;
  diagnosisData?: any;
}

const DownloadGuideModal: React.FC<DownloadGuideModalProps> = ({ isOpen, onClose, combatScore, rank, phoneNumber, diagnosisData }) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // APIを呼び出してメールアドレスを保存し、ダウンロードリンクを取得
      const response = await fetch('/api/save-email-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          phoneNumber: phoneNumber || sessionStorage.getItem('userPhoneNumber'),
          diagnosisData: diagnosisData || {
            score: combatScore,
            rank: rank,
            answers: JSON.parse(sessionStorage.getItem('diagnosisAnswers') || '{}')
          }
        })
      });

      if (!response.ok) {
        throw new Error('メールアドレスの保存に失敗しました');
      }

      const data = await response.json();
      setDownloadUrl(data.downloadUrl);
      setIsSuccess(true);
      
      // ダウンロードを開始
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      }
      
      // 成功後3秒でモーダルを閉じる
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setEmail('');
        setDownloadUrl(null);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '1.5rem',
        maxWidth: '500px',
        width: '100%',
        padding: '2.5rem',
        position: 'relative',
        animation: 'slideUp 0.3s ease-out',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: '#6B7280',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F3F4F6';
            e.currentTarget.style.color = '#000';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#6B7280';
          }}
        >
          ×
        </button>

        {!isSuccess ? (
          <>
            {/* ヘッダー */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                display: 'inline-block',
                padding: '0.5rem 1.5rem',
                background: 'linear-gradient(135deg, #FFD700 0%, #FFA000 100%)',
                borderRadius: '9999px',
                marginBottom: '1rem',
                boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)'
              }}>
                <span style={{
                  color: '#000',
                  fontWeight: 800,
                  fontSize: '1.125rem'
                }}>
                  攻略本を無料でお届け！
                </span>
              </div>
              
              <h2 style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: '#1F2937',
                marginBottom: '0.5rem'
              }}>
                資金調達完全攻略マニュアル
              </h2>
              
              <p style={{
                color: '#6B7280',
                fontSize: '1rem',
                lineHeight: 1.6
              }}>
                あなたの戦闘力{combatScore}点（{rank}ランク）に合わせた<br />
                最適な資金調達戦略をまとめました
              </p>
            </div>

            {/* 特典内容 */}
            <div style={{
              background: '#F9FAFB',
              borderRadius: '1rem',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: '#374151',
                marginBottom: '1rem'
              }}>
                📘 攻略本の内容
              </h3>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                fontSize: '0.875rem',
                color: '#4B5563',
                lineHeight: 1.8
              }}>
                <li>✅ 戦闘力を最大化する5つの改善ポイント</li>
                <li>✅ 主要キャッシング・ファクタリング業者比較表</li>
                <li>✅ 審査通過率を上げる書類準備チェックリスト</li>
                <li>✅ 返済シミュレーションテンプレート</li>
                <li>✅ 緊急時の即日融資ガイド</li>
              </ul>
            </div>

            {/* フォーム */}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    fontSize: '1rem',
                    border: '2px solid #E5E7EB',
                    borderRadius: '0.5rem',
                    outline: 'none',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#FFD700';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: isSubmitting 
                    ? '#9CA3AF' 
                    : 'linear-gradient(135deg, #FFD700 0%, #FFA000 100%)',
                  color: isSubmitting ? '#fff' : '#000',
                  border: 'none',
                  borderRadius: '0.75rem',
                  fontSize: '1.125rem',
                  fontWeight: 800,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: isSubmitting 
                    ? 'none' 
                    : '0 10px 25px rgba(255, 215, 0, 0.3)'
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 15px 35px rgba(255, 215, 0, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(255, 215, 0, 0.3)';
                }}
              >
                {isSubmitting ? '送信中...' : '無料で攻略本を受け取る'}
              </button>

              <p style={{
                marginTop: '1rem',
                fontSize: '0.75rem',
                color: '#9CA3AF',
                textAlign: 'center',
                lineHeight: 1.5
              }}>
                ※メールアドレスは攻略本の送信のみに使用します<br />
                ※迷惑メールは一切送信いたしません
              </p>
              
              {error && (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #FECACA',
                  borderRadius: '0.5rem',
                  color: '#DC2626',
                  fontSize: '0.875rem',
                  textAlign: 'center'
                }}>
                  {error}
                </div>
              )}
            </form>
          </>
        ) : (
          /* 成功メッセージ */
          <div style={{
            textAlign: 'center',
            padding: '2rem 0'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 1.5rem',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'scaleIn 0.5s ease-out'
            }}>
              <svg width="40" height="40" fill="none" stroke="white" strokeWidth="3">
                <path d="M5 20 L15 30 L35 10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#059669',
              marginBottom: '0.5rem'
            }}>
              送信完了しました！
            </h3>
            
            <p style={{
              color: '#4B5563',
              fontSize: '1rem',
              lineHeight: 1.6
            }}>
              診断結果のダウンロードが開始されました。<br />
              ダウンロードが始まらない場合は、ポップアップブロックを解除してください。
            </p>
            
            {downloadUrl && (
              <button
                onClick={() => window.open(downloadUrl, '_blank')}
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                ダウンロードを再開
              </button>
            )}
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes scaleIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default DownloadGuideModal;