import React, { useEffect, useState } from 'react';
import DownloadGuideModal from './DownloadGuideModal';

interface CombatPowerResultsProps {
  diagnosisAnswers: Record<number, string>;
  onDownloadGuide: () => void;
}

interface SubScores {
  attackPower: number;
  defensePower: number;
  mobility: number;
}

const CombatPowerResults: React.FC<CombatPowerResultsProps> = ({ diagnosisAnswers, onDownloadGuide }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  
  // スコア計算ロジック
  const calculateScores = (): { total: number; rank: string; subScores: SubScores; comment: string } => {
    let attackPower = 0;
    let defensePower = 0;
    let mobility = 0;
    
    // 年収による攻撃力計算
    switch (diagnosisAnswers[1]) {
      case '～300万円': attackPower += 15; break;
      case '300～500万円': attackPower += 25; break;
      case '500～800万円': attackPower += 35; break;
      case '800万円～': attackPower += 40; break;
    }
    
    // 口座残高による防御力計算
    switch (diagnosisAnswers[2]) {
      case '～10万円': defensePower += 10; break;
      case '10～50万円': defensePower += 20; break;
      case '50～100万円': defensePower += 30; break;
      case '100万円～': defensePower += 40; break;
    }
    
    // 借入件数による減点
    switch (diagnosisAnswers[3]) {
      case '0件': defensePower += 20; attackPower += 10; break;
      case '1～2件': defensePower += 10; break;
      case '3件以上': defensePower -= 10; attackPower -= 5; break;
    }
    
    // 返済負担率による調整
    switch (diagnosisAnswers[4]) {
      case '収入に対して返済が10%未満': defensePower += 20; break;
      case '10～30%': defensePower += 10; break;
      case '30%以上': defensePower -= 10; break;
    }
    
    // 緊急度による機動力
    switch (diagnosisAnswers[5]) {
      case '今すぐ': mobility = 30; break;
      case '1週間以内': mobility = 20; break;
      case '1ヶ月以内': mobility = 10; break;
    }
    
    // スコアの正規化（各項目を0-100の範囲に）
    attackPower = Math.max(0, Math.min(100, attackPower * 2));
    defensePower = Math.max(0, Math.min(100, defensePower * 1.5));
    mobility = Math.max(0, Math.min(100, mobility * 3.33));
    
    const total = Math.round((attackPower + defensePower + mobility) / 3);
    
    // ランク判定
    let rank = 'C';
    if (total >= 80) rank = 'S';
    else if (total >= 60) rank = 'A';
    else if (total >= 40) rank = 'B';
    
    // パーソナライズドコメント
    let comment = '';
    if (rank === 'S') {
      comment = `戦闘力${total}点！最高ランクです。多くの選択肢から最適な条件を選べる立場にあります。`;
    } else if (rank === 'A') {
      comment = `戦闘力${total}点！良好な状態です。${attackPower > defensePower ? '特に調達力が高く' : '特に返済余力があり'}、安心して資金調達を進められます。`;
    } else if (rank === 'B') {
      comment = `戦闘力${total}点！標準的な状態です。${defensePower < 30 ? '返済計画を見直すことで' : '収入証明を準備することで'}、より良い条件が期待できます。`;
    } else {
      comment = `戦闘力${total}点！まずは現状を整理しましょう。専門家への相談も検討してください。`;
    }
    
    return {
      total,
      rank,
      subScores: { attackPower, defensePower, mobility },
      comment
    };
  };
  
  const { total, rank, subScores, comment } = calculateScores();
  
  useEffect(() => {
    setIsAnimating(true);
    // スコアのカウントアップアニメーション
    const interval = setInterval(() => {
      setCurrentScore(prev => {
        if (prev >= total) {
          clearInterval(interval);
          return total;
        }
        return Math.min(prev + 2, total);
      });
    }, 30);
    
    return () => clearInterval(interval);
  }, [total]);

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'S': return '#F5A623'; // ゴールド
      case 'A': return '#3174F3'; // ブルー
      case 'B': return '#10B981'; // グリーン
      case 'C': return '#6B7280'; // グレー
      default: return '#6B7280';
    }
  };

  // レーダーチャート描画用の座標計算
  const calculateRadarPoints = (scores: SubScores): string => {
    const centerX = 150;
    const centerY = 150;
    const radius = 100;
    const angles = [-90, 30, 150]; // 上、右下、左下
    
    const points = [
      scores.attackPower,
      scores.defensePower,
      scores.mobility
    ].map((score, index) => {
      const angle = angles[index] * Math.PI / 180;
      const r = (score / 100) * radius;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      return `${x},${y}`;
    });
    
    return points.join(' ');
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F7F9FC',
      padding: '80px 20px 40px',
      position: 'relative'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* タイトル */}
        <div style={{
          textAlign: 'center',
          marginBottom: '48px',
          animation: 'fadeIn 0.8s ease-out'
        }}>
          <h1 style={{
            fontSize: 'clamp(2rem, 4vw, 2.5rem)',
            fontWeight: 700,
            color: '#333333',
            marginBottom: '8px'
          }}>
            診断結果
          </h1>
          <p style={{
            fontSize: '18px',
            color: '#666666'
          }}>
            あなたの資金調達力
          </p>
        </div>
        
        {/* メインスコアカード */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          padding: '48px',
          marginBottom: '32px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
          textAlign: 'center',
          animation: 'slideUp 0.8s ease-out 0.2s both'
        }}>
          {/* 総合スコア */}
          <div style={{
            fontSize: 'clamp(3rem, 8vw, 5rem)',
            fontWeight: 700,
            lineHeight: 1,
            marginBottom: '16px',
            color: getRankColor(rank)
          }}>
            {currentScore}
            <span style={{ fontSize: '0.5em', fontWeight: 500 }}>点</span>
          </div>
          
          {/* ランク表示 */}
          <div style={{
            display: 'inline-block',
            padding: '12px 32px',
            backgroundColor: getRankColor(rank),
            color: '#FFFFFF',
            borderRadius: '999px',
            fontSize: '24px',
            fontWeight: 700,
            marginBottom: '40px',
            boxShadow: `0 4px 16px ${getRankColor(rank)}40`
          }}>
            {rank}ランク
          </div>
          
          {/* レーダーチャート */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '40px'
          }}>
            <svg width="300" height="300" viewBox="0 0 300 300" style={{ maxWidth: '100%' }}>
              {/* 背景グリッド */}
              <g opacity="0.3">
                {[20, 40, 60, 80, 100].map((size) => (
                  <polygon
                    key={size}
                    points={calculateRadarPoints({ 
                      attackPower: size, 
                      defensePower: size, 
                      mobility: size 
                    })}
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="1"
                  />
                ))}
                {/* 軸線 */}
                <line x1="150" y1="150" x2="150" y2="50" stroke="#E5E7EB" strokeWidth="1" />
                <line x1="150" y1="150" x2="237" y2="200" stroke="#E5E7EB" strokeWidth="1" />
                <line x1="150" y1="150" x2="63" y2="200" stroke="#E5E7EB" strokeWidth="1" />
              </g>
              
              {/* データプロット */}
              <polygon
                points={calculateRadarPoints(subScores)}
                fill={`${getRankColor(rank)}20`}
                stroke={getRankColor(rank)}
                strokeWidth="3"
                strokeLinejoin="round"
              />
              
              {/* データポイント */}
              {calculateRadarPoints(subScores).split(' ').map((point, index) => {
                const [x, y] = point.split(',').map(Number);
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="6"
                    fill={getRankColor(rank)}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                );
              })}
              
              {/* ラベル */}
              <text x="150" y="30" textAnchor="middle" fill="#333333" fontSize="14" fontWeight="600">
                攻撃力
              </text>
              <text x="260" y="220" textAnchor="middle" fill="#333333" fontSize="14" fontWeight="600">
                防御力
              </text>
              <text x="40" y="220" textAnchor="middle" fill="#333333" fontSize="14" fontWeight="600">
                機動力
              </text>
              
              {/* スコア表示 */}
              <text x="150" y="70" textAnchor="middle" fill="#666666" fontSize="12">
                {Math.round(subScores.attackPower)}
              </text>
              <text x="230" y="190" textAnchor="middle" fill="#666666" fontSize="12">
                {Math.round(subScores.defensePower)}
              </text>
              <text x="70" y="190" textAnchor="middle" fill="#666666" fontSize="12">
                {Math.round(subScores.mobility)}
              </text>
            </svg>
          </div>
          
          {/* サブスコア詳細 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '24px',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            <div>
              <div style={{ fontSize: '12px', color: '#999999', marginBottom: '4px' }}>
                攻撃力
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#333333' }}>
                {Math.round(subScores.attackPower)}
              </div>
              <div style={{ fontSize: '12px', color: '#666666' }}>
                調達ポテンシャル
              </div>
            </div>
            
            <div>
              <div style={{ fontSize: '12px', color: '#999999', marginBottom: '4px' }}>
                防御力
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#333333' }}>
                {Math.round(subScores.defensePower)}
              </div>
              <div style={{ fontSize: '12px', color: '#666666' }}>
                返済余力
              </div>
            </div>
            
            <div>
              <div style={{ fontSize: '12px', color: '#999999', marginBottom: '4px' }}>
                機動力
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#333333' }}>
                {Math.round(subScores.mobility)}
              </div>
              <div style={{ fontSize: '12px', color: '#666666' }}>
                資金入手スピード
              </div>
            </div>
          </div>
        </div>
        
        {/* パーソナライズドコメント */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '32px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          animation: 'slideUp 0.8s ease-out 0.4s both'
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#333333',
            marginBottom: '16px'
          }}>
            総合評価
          </h3>
          <p style={{
            fontSize: '16px',
            color: '#666666',
            lineHeight: 1.8,
            margin: 0
          }}>
            {comment}
          </p>
        </div>
        
        {/* ミニアドバイス */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '48px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          animation: 'slideUp 0.8s ease-out 0.6s both'
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#333333',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              backgroundColor: '#3174F3',
              color: '#FFFFFF',
              borderRadius: '50%',
              fontSize: '16px'
            }}>
              ✓
            </span>
            調査前にここをチェック！
          </h3>
          <ul style={{
            paddingLeft: '20px',
            margin: 0,
            color: '#666666',
            fontSize: '16px',
            lineHeight: 2
          }}>
            <li>必要書類を事前に準備（本人確認書類、収入証明書など）</li>
            <li>借入希望額と返済期間を明確にする</li>
            <li>複数の業者を比較して最適な条件を見つける</li>
          </ul>
        </div>
        
        {/* CTA - 攻略本ダウンロード */}
        <div style={{
          textAlign: 'center',
          animation: 'slideUp 0.8s ease-out 0.8s both'
        }}>
          <button
            onClick={() => setShowDownloadModal(true)}
            className="btn-accent btn-pulse"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '20px 48px',
              backgroundColor: '#F5A623',
              color: '#FFFFFF',
              fontSize: '18px',
              fontWeight: 700,
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 16px rgba(245, 166, 35, 0.3)',
              position: 'relative',
              width: '100%',
              maxWidth: '400px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#E89100';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 166, 35, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F5A623';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(245, 166, 35, 0.3)';
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7V12C2 16.5 4.5 20.5 12 22C19.5 20.5 22 16.5 22 12V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 11V15M12 8V8.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            攻略本ダウンロード
          </button>
          
          <div style={{
            marginTop: '24px',
            fontSize: '16px',
            color: '#666666',
            lineHeight: 1.6
          }}>
            <strong style={{ color: '#333333' }}>完全無料</strong>のPDFマニュアル<br />
            5分で読める資金調達の成功法則
          </div>
        </div>
      </div>
      
      {/* ダウンロードモーダル */}
      <DownloadGuideModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        combatScore={total}
        rank={rank}
        phoneNumber={sessionStorage.getItem('userPhoneNumber') || undefined}
        diagnosisData={{
          score: total,
          rank: rank,
          answers: diagnosisAnswers
        }}
      />
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .btn-pulse {
          animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
};

export default CombatPowerResults;