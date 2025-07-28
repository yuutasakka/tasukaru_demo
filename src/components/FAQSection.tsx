import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: "診断は本当に無料ですか？",
    answer: "はい、完全無料です。診断結果の確認、攻略本のダウンロードまで、一切費用はかかりません。個人情報の入力も最小限で、安心してご利用いただけます。"
  },
  {
    question: "診断結果はどのくらい正確ですか？",
    answer: "5万人以上の診断データを基に、金融業界の専門家が監修したアルゴリズムを使用しています。ただし、あくまで目安としてご活用ください。実際の審査結果は金融機関により異なります。"
  },
  {
    question: "個人情報は安全に管理されますか？",
    answer: "SSL暗号化通信により、すべての情報は安全に保護されています。また、診断に必要な最小限の情報のみを収集し、第三者への提供は一切行いません。"
  },
  {
    question: "診断後に営業の電話がかかってきますか？",
    answer: "いいえ、診断後の営業電話は一切ありません。攻略本ダウンロード時にメールアドレスをご入力いただいた場合も、PDFの送信のみに使用し、営業メールは送信しません。"
  },
  {
    question: "診断結果が低かった場合はどうすればいいですか？",
    answer: "診断結果はあくまで現在の状況を示すものです。攻略本には、各スコアを改善するための具体的なアドバイスが記載されています。まずは無料でダウンロードして、改善ポイントをご確認ください。"
  },
  {
    question: "攻略本にはどんな内容が含まれていますか？",
    answer: "戦闘力スコアの詳細解説、各スコアの改善方法、主要金融機関の比較表、審査通過のコツ、必要書類チェックリストなど、資金調達を成功させるための実践的な情報が満載です。"
  },
  {
    question: "診断は何度でも受けられますか？",
    answer: "はい、何度でも無料で診断を受けることができます。状況が変わった際は、改めて診断を受けて最新の戦闘力をチェックすることをおすすめします。"
  }
];

const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [contactInfo, setContactInfo] = useState({
    phone_number: '0120-123-456',
    email: 'support@taskaru.jp',
    line_url: ''
  });

  useEffect(() => {
    loadContactInfo();
  }, []);

  const loadContactInfo = async () => {
    try {
      // expert_contact_settingsテーブルから連絡先情報を取得
      const { data, error } = await supabase
        .from('expert_contact_settings')
        .select('phone_number, email, line_url')
        .eq('setting_key', 'primary_financial_advisor')
        .eq('is_active', true)
        .single();

      if (data && !error) {
        setContactInfo({
          phone_number: data.phone_number || '0120-123-456',
          email: data.email || 'support@taskaru.jp',
          line_url: data.line_url || ''
        });
      }
    } catch (error) {
    }
  };

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const handleContactClick = () => {
    // 優先順位: LINE > メール > 電話
    if (contactInfo.line_url) {
      window.open(contactInfo.line_url, '_blank');
    } else if (contactInfo.email) {
      window.location.href = `mailto:${contactInfo.email}`;
    } else if (contactInfo.phone_number) {
      window.location.href = `tel:${contactInfo.phone_number}`;
    }
  };

  return (
    <section id="faq" style={{
      backgroundColor: '#FFFFFF',
      padding: '80px 20px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* タイトル */}
        <div style={{
          textAlign: 'center',
          marginBottom: '48px'
        }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 4vw, 2.5rem)',
            fontWeight: 700,
            color: '#2C3E50',
            marginBottom: '16px'
          }}>
            よくある質問
          </h2>
          <p style={{
            fontSize: '18px',
            color: '#34495E'
          }}>
            お客様からよくいただく質問にお答えします
          </p>
        </div>

        {/* FAQ アコーディオン */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {faqItems.map((item, index) => (
            <div
              key={index}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #ECF0F1',
                borderRadius: '12px',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                boxShadow: openIndex === index ? '0 4px 12px rgba(44, 62, 80, 0.08)' : 'none'
              }}
            >
              <button
                onClick={() => toggleAccordion(index)}
                style={{
                  width: '100%',
                  padding: '24px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textAlign: 'left',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F7F9FC';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#333333',
                  flex: 1,
                  paddingRight: '16px'
                }}>
                  {item.question}
                </span>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: openIndex === index ? '#3174F3' : '#F7F9FC',
                  transition: 'all 0.3s ease',
                  flexShrink: 0
                }}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    style={{
                      transform: openIndex === index ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease'
                    }}
                  >
                    <path
                      d="M4 6L8 10L12 6"
                      stroke={openIndex === index ? '#FFFFFF' : '#666666'}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
              
              {/* アンサー部分 */}
              <div style={{
                maxHeight: openIndex === index ? '500px' : '0',
                overflow: 'hidden',
                transition: 'max-height 0.3s ease',
                backgroundColor: '#F7F9FC'
              }}>
                <div style={{
                  padding: '0 24px 24px',
                  animation: openIndex === index ? 'fadeIn 0.3s ease-out' : 'none'
                }}>
                  <p style={{
                    fontSize: '16px',
                    color: '#666666',
                    lineHeight: 1.8,
                    margin: 0
                  }}>
                    {item.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 追加の質問CTA */}
        <div style={{
          textAlign: 'center',
          marginTop: '48px',
          padding: '32px',
          backgroundColor: '#F7F9FC',
          borderRadius: '16px'
        }}>
          <p style={{
            fontSize: '16px',
            color: '#666666',
            marginBottom: '16px'
          }}>
            その他のご質問がございましたら、お気軽にお問い合わせください
          </p>
          <button
            onClick={handleContactClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.backgroundColor = '#1d4ed8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
          >
            お問い合わせはこちら
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </section>
  );
};

export default FAQSection;