import React, { useState } from 'react';

interface Question {
  id: number;
  question: string;
  options: string[];
  helpText?: string;
}

interface DiagnosisFormProps {
  onComplete: (answers: Record<number, string>) => void;
}

const questions: Question[] = [
  {
    id: 1,
    question: "年間収入レンジを教えてください",
    options: ["～300万円", "300～500万円", "500～800万円", "800万円～"],
    helpText: "年収は審査の重要ポイント。安定収入があれば低金利の選択肢が広がります。"
  },
  {
    id: 2,
    question: "普段の口座残高（現金＋預金）は？",
    options: ["～10万円", "10～50万円", "50～100万円", "100万円～"],
    helpText: "預金残高は返済能力の証明に。多いほど審査通過率がアップします。"
  },
  {
    id: 3,
    question: "現在の借入件数（クレジット含む）は？",
    options: ["0件", "1～2件", "3件以上"],
    helpText: "借入件数が少ないほど有利。3件以上は「おまとめ」も検討を。"
  },
  {
    id: 4,
    question: "月々の返済負担率は？",
    options: ["収入に対して返済が10%未満", "10～30%", "30%以上"],
    helpText: "返済負担率＝（毎月の借入返済合計）÷（月収）。30%以下が理想的です。"
  },
  {
    id: 5,
    question: "資金が必要な緊急度は？",
    options: ["今すぐ", "1週間以内", "1ヶ月以内"],
    helpText: "急ぎの場合は即日融資可能な業者を、余裕があれば低金利サービスを選べます。"
  }
];

const DiagnosisForm: React.FC<DiagnosisFormProps> = ({ onComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showHelpText, setShowHelpText] = useState(false);

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleAnswer = (answer: string) => {
    setSelectedOption(answer);
    setIsAnimating(true);
    
    setTimeout(() => {
      const newAnswers = { ...answers, [questions[currentQuestion].id]: answer };
      setAnswers(newAnswers);
      
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedOption(null);
        setIsAnimating(false);
        setShowHelpText(false);
      } else {
        onComplete(newAnswers);
      }
    }, 300);
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedOption(null);
      setShowHelpText(false);
    }
  };

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px'
    }}>
      {/* プログレスステップバー */}
      <div style={{
        marginBottom: '40px'
      }}>
        {/* ステップインジケーター */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '12px',
          position: 'relative'
        }}>
          {/* 背景ライン */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '24px',
            right: '24px',
            height: '2px',
            backgroundColor: '#E5E7EB',
            zIndex: 0
          }} />
          {/* アクティブライン */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '24px',
            height: '2px',
            backgroundColor: '#3174F3',
            width: `calc(${(currentQuestion / (questions.length - 1)) * 100}% - 48px)`,
            transition: 'width 0.5s ease',
            zIndex: 0
          }} />
          
          {/* ステップドット */}
          {[...Array(questions.length)].map((_, index) => (
            <div
              key={index}
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: index <= currentQuestion ? '#3174F3' : '#FFFFFF',
                border: index <= currentQuestion ? 'none' : '2px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                boxShadow: index === currentQuestion ? '0 0 0 4px rgba(49, 116, 243, 0.2)' : 'none'
              }}>
                {index < currentQuestion && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L4.5 8.5L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {index === currentQuestion && (
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF'
                  }} />
                )}
              </div>
              <span style={{
                fontSize: '12px',
                color: index <= currentQuestion ? '#3174F3' : '#999999',
                marginTop: '4px',
                fontWeight: index === currentQuestion ? 600 : 400
              }}>
                {index + 1}
              </span>
            </div>
          ))}
        </div>

        {/* 進捗率表示 */}
        <div style={{
          textAlign: 'center',
          fontSize: '14px',
          color: '#666666',
          marginTop: '8px'
        }}>
          進捗: {Math.round(progress)}%
        </div>
      </div>

      {/* 質問カード */}
      <div 
        key={currentQuestion}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
          marginBottom: '24px',
          animation: 'slideIn 0.4s ease-out'
        }}
      >
        {/* 質問文 */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#333333',
            margin: 0,
            flex: 1
          }}>
            {questions[currentQuestion].question}
          </h2>
          {questions[currentQuestion].helpText && (
            <button
              onClick={() => setShowHelpText(!showHelpText)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: showHelpText ? '#3174F3' : '#F7F9FC',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '16px',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
              aria-label="ヘルプを表示"
            >
              <span style={{
                fontSize: '16px',
                fontWeight: 700,
                color: showHelpText ? '#FFFFFF' : '#3174F3'
              }}>
                ℹ
              </span>
            </button>
          )}
        </div>

        {/* ヘルプテキスト */}
        {showHelpText && questions[currentQuestion].helpText && (
          <div style={{
            backgroundColor: '#F7F9FC',
            borderLeft: '4px solid #3174F3',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <p style={{
              fontSize: '14px',
              color: '#666666',
              lineHeight: 1.6,
              margin: 0
            }}>
              {questions[currentQuestion].helpText}
            </p>
          </div>
        )}

        {/* 選択肢 */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {questions[currentQuestion].options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(option)}
              disabled={isAnimating}
              style={{
                width: '100%',
                padding: '20px 24px',
                borderRadius: '12px',
                border: selectedOption === option ? '2px solid #3174F3' : '2px solid #E5E7EB',
                backgroundColor: selectedOption === option ? '#F0F5FF' : '#FFFFFF',
                color: selectedOption === option ? '#3174F3' : '#333333',
                fontSize: '16px',
                fontWeight: selectedOption === option ? 600 : 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                position: 'relative',
                animation: `fadeIn 0.3s ease-out ${index * 0.1}s both`
              }}
              onMouseEnter={(e) => {
                if (selectedOption !== option) {
                  e.currentTarget.style.borderColor = '#B8D0FF';
                  e.currentTarget.style.backgroundColor = '#F7FAFF';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedOption !== option) {
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }
              }}
            >
              <span>{option}</span>
              {selectedOption === option && (
                <svg 
                  style={{
                    position: 'absolute',
                    right: '24px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '20px',
                    height: '20px'
                  }}
                  viewBox="0 0 20 20" 
                  fill="none"
                >
                  <circle cx="10" cy="10" r="10" fill="#3174F3" />
                  <path d="M6 10L8.5 12.5L14 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ナビゲーション */}
      <div style={{
        display: 'flex',
        justifyContent: currentQuestion > 0 ? 'space-between' : 'flex-end',
        alignItems: 'center',
        gap: '16px'
      }}>
        {currentQuestion > 0 && (
          <button
            onClick={handleBack}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '2px solid #E5E7EB',
              backgroundColor: '#FFFFFF',
              color: '#666666',
              fontSize: '16px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#3174F3';
              e.currentTarget.style.color = '#3174F3';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.color = '#666666';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            前の質問へ
          </button>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 768px) {
          .question-card {
            padding: 24px 16px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default DiagnosisForm;