import React, { useState, useRef, useEffect } from 'react';
import { createSupabaseClient } from './adminUtils';
import { secureLog } from '../config/clientSecurity';

// XSS攻撃防止のためのサニタイゼーション関数
const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  // HTMLタグとスクリプトを除去
  const sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*>/gi, '')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<[^>]*vbscript:/gi, '')
    .replace(/<[^>]*data:/gi, '')
    .replace(/&lt;script/gi, '')
    .replace(/&lt;\/script/gi, '')
    .trim();
    
  // 長すぎる入力を制限（DoS攻撃防止）
  return sanitized.length > 1000 ? sanitized.substring(0, 1000) + '...' : sanitized;
};

// 入力値検証
const validateInput = (input: string): boolean => {
  if (!input || input.trim().length === 0) return false;
  if (input.length > 1000) return false;
  
  // 危険なパターンをチェック
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /data:/i,
    /onload=/i,
    /onerror=/i,
    /onclick=/i
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(input));
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sanitized?: boolean; // サニタイゼーション済みフラグ
}

interface ExpertContact {
  expert_name: string;
  phone_number: string;
  email?: string;
  business_hours?: string;
  description?: string;
}

interface MCPFinancialAssistantProps {
  className?: string;
  diagnosisData?: any;
}

export const MCPFinancialAssistant: React.FC<MCPFinancialAssistantProps> = ({ className = '', diagnosisData }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `こんにちは！🤖
私はタスカルのAI財務アドバイザーです。

お客様の財務状況を分析して、最適なアドバイスをお届けします✨

📋 利用可能な機能
• 財務健康診断
• 投資シミュレーション
• ポートフォリオ分析
• 緊急資金計算

⚠️ AI相談は3回まで無料です
それ以降は専門家による電話相談をご案内いたします。

どのような財務相談をお手伝いしましょうか？😊`,
      timestamp: new Date(),
      sanitized: true
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [expertContact, setExpertContact] = useState<ExpertContact | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [lastRequestTime, setLastRequestTime] = useState<number>(0);
  const [rateLimitExceeded, setRateLimitExceeded] = useState<boolean>(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadExpertContact();
  }, []);

  const loadExpertContact = async () => {
    try {
      const supabaseConfig = createSupabaseClient();
      
      // Supabase設定を確認
      if (!supabaseConfig.url || !supabaseConfig.key || 
          supabaseConfig.url.includes('your-project') || 
          supabaseConfig.key.includes('your-anon-key')) {
        secureLog('Supabase設定が無効、デフォルト専門家連絡先を使用');
        
        // デフォルト値を設定
        setExpertContact({
          expert_name: 'タスカル専門アドバイザー',
          phone_number: '0120-123-456',
          business_hours: '平日 9:00-18:00',
          description: 'タスカルの認定ファイナンシャルプランナーが、お客様の資産運用に関するご相談を承ります。'
        });
        return;
      }

      // Supabaseから取得を試行（エラーハンドリング強化）
      try {
        const response = await fetch(`${supabaseConfig.url}/rest/v1/expert_contact_settings?setting_key.eq=${encodeURIComponent('primary_financial_advisor')}&is_active.eq=true&select=*`, {
          headers: {
            'Authorization': `Bearer ${supabaseConfig.key}`,
            'apikey': supabaseConfig.key,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            const expertContactData = {
              expert_name: data[0].expert_name,
              phone_number: data[0].phone_number,
              email: data[0].email,
              business_hours: data[0].business_hours,
              description: data[0].description
            };
            setExpertContact(expertContactData);
            secureLog('Supabaseから専門家連絡先を読み込み');
            return;
          }
        } else if (response.status === 400) {
          secureLog(`Supabase専門家連絡先テーブルが存在しません (400エラー) - デフォルト値を使用`);
        } else {
          secureLog(`Supabase専門家連絡先取得エラー: ${response.status} ${response.statusText}`);
        }
      } catch (fetchError) {
        secureLog('Supabase専門家連絡先フェッチエラー:', fetchError);
      }

      // デフォルト値を設定
      setExpertContact({
        expert_name: 'タスカル専門アドバイザー',
        phone_number: '0120-123-456',
        business_hours: '平日 9:00-18:00',
        description: 'タスカルの認定ファイナンシャルプランナーが、お客様の資産運用に関するご相談を承ります。'
      });
    } catch (error) {
      secureLog('専門家連絡先の読み込みエラー:', error);
      
      // エラー時はデフォルト値を設定
      setExpertContact({
        expert_name: 'タスカル専門アドバイザー',
        phone_number: '0120-123-456',
        business_hours: '平日 9:00-18:00',
        description: 'タスカルの認定ファイナンシャルプランナーが、お客様の資産運用に関するご相談を承ります。'
      });
    }
  };

  const predefinedQuestions = [
    {
      text: "財務健康診断をお願いします",
      prompt: "私の財務状況を診断してください。年齢: 35歳、年収: 600万円、月間支出: 30万円、貯蓄: 200万円、借金: 100万円、投資目標: 老後資金、リスク許容度: medium"
    },
    {
      text: "投資シミュレーションを実行",
      prompt: "投資シミュレーションをお願いします。元本: 100万円、月次積立: 5万円、想定年利: 5%、投資期間: 20年"
    },
    {
      text: "ポートフォリオを分析",
      prompt: "ポートフォリオ分析をお願いします。資産配分: 国内株式50%、外国株式30%、債券20%、投資期間: 15年、リスク許容度: moderate"
    },
    {
      text: "緊急資金を計算",
      prompt: "緊急資金計算をお願いします。月間生活費: 25万円、現在の貯蓄: 150万円、雇用安定性: stable、扶養家族: 2人"
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // 入力値検証
    if (!validateInput(input)) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '申し訳ありませんが、入力内容に問題があります。適切な質問を入力してください。',
        timestamp: new Date(),
        sanitized: true
      };
      setMessages(prev => [...prev, errorMessage]);
      setInput('');
      return;
    }

    // 入力をサニタイゼーション
    const sanitizedInput = sanitizeInput(input);
    
    // レート制限チェック（3秒間隔）
    const currentTime = Date.now();
    if (currentTime - lastRequestTime < 3000) {
      setRateLimitExceeded(true);
      const rateLimitMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '申し訳ありませんが、リクエストが頻繁すぎます。3秒後に再度お試しください。',
        timestamp: new Date(),
        sanitized: true
      };
      setMessages(prev => [...prev, rateLimitMessage]);
      setTimeout(() => setRateLimitExceeded(false), 3000);
      return;
    }
    setLastRequestTime(currentTime);
    
    // 3回制限チェック
    if (questionCount >= 3) {
      const limitMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `🚨 AI相談回数上限に達しました

AI財務アドバイザーは3回まで無料でご利用いただけます。

📞 専門家による個別相談をご利用ください

より詳細なアドバイスが必要でしたら、タスカルの専門家が直接お電話でご相談を承ります。

📋 専門家情報
• 担当者: ${expertContact?.expert_name || 'タスカル専門アドバイザー'}
• 電話番号: ${expertContact?.phone_number || '0120-123-456'}
• 受付時間: ${expertContact?.business_hours || '平日 9:00-18:00'}

${expertContact?.description || 'タスカルの認定ファイナンシャルプランナーが、お客様の資産運用に関するご相談を承ります。'}

お気軽にお電話ください！😊`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, limitMessage]);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: sanitizedInput,
      timestamp: new Date(),
      sanitized: true
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setQuestionCount(prev => prev + 1);

    try {
      // 本番環境でのMCP AI API呼び出し
      const response = await fetch('/api/mcp/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          context: {
            diagnosisData: diagnosisData,
            questionCount: questionCount,
            maxQuestions: 3
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API エラー: ${response.status}`);
      }

      const data = await response.json();
      const responseContent = data.response || 'AI応答の取得に失敗しました。';
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        sanitized: true
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '申し訳ありません。エラーが発生しました。もう一度お試しください。',
        timestamp: new Date(),
        sanitized: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePredefinedQuestion = (prompt: string) => {
    // 定型質問もサニタイゼーション
    const sanitizedPrompt = sanitizeInput(prompt);
    if (validateInput(sanitizedPrompt)) {
      setInput(sanitizedPrompt);
    }
  };

  return (
    <div className={`bg-gray-50 rounded-xl shadow-lg border border-gray-200 ${className}`}>
      {/* LINEスタイルヘッダー */}
      <div className="bg-green-500 text-white p-4 rounded-t-xl flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-green-500 text-xl font-bold">
          🤖
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold">AI財務アドバイザー</h2>
          <p className="text-green-100 text-sm">
            オンライン - タスカル専属AI
          </p>
        </div>
        <div className="text-sm bg-green-600 px-3 py-1 rounded-full">
          MCP対応
        </div>
      </div>

      {/* LINEスタイルメッセージエリア */}
      <div className="h-96 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-gray-100">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-end gap-2 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* アバター */}
            {message.role === 'assistant' && (
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                🤖
              </div>
            )}
            {message.role === 'user' && (
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                👤
              </div>
            )}
            
            {/* メッセージバブル */}
            <div className={`max-w-[75%] ${message.role === 'user' ? 'order-first' : ''}`}>
              <div
                className={`p-3 rounded-2xl shadow-sm ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white ml-auto'
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}
              >
                {message.role === 'user' ? (
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                ) : (
                  <div className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </div>
                )}
              </div>
              <div className={`text-xs mt-1 px-2 ${
                message.role === 'user' ? 'text-right text-gray-500' : 'text-left text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString('ja-JP', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-end gap-2">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
              🤖
            </div>
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-sm text-gray-600">分析中...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* LINEスタイル定型質問 */}
      {questionCount < 3 && (
        <div className="border-t border-gray-200 p-4 bg-white">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            💬 よくある質問
          </h3>
          <div className="space-y-2">
            {predefinedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handlePredefinedQuestion(question.prompt)}
                className="w-full text-left text-sm bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl p-3 transition-colors flex items-center gap-2"
                disabled={isLoading}
              >
                <span className="text-blue-500">💡</span>
                {question.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* LINEスタイル入力フォーム */}
      <div className="border-t border-gray-200 p-4 bg-white rounded-b-xl">
        {questionCount >= 3 ? (
          <div className="text-center p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-2xl">
            <div className="text-2xl mb-2">📞</div>
            <p className="text-orange-800 font-medium mb-2">
              AI相談回数上限に達しました
            </p>
            <p className="text-sm text-orange-700 mb-3">
              より詳細な相談は専門家にお電話ください
            </p>
            <div className="bg-white p-3 rounded-xl border border-orange-200">
              <p className="font-bold text-orange-800 text-lg">
                {expertContact?.phone_number || '0120-123-456'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3 text-sm text-gray-600 text-center bg-gray-50 rounded-full py-2">
              残り <strong className="text-green-600">{3 - questionCount}</strong> 回のAI相談が可能です ✨
            </div>
            <form onSubmit={handleSubmit} className="flex gap-3 items-end">
              <div className="flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="メッセージを入力..."
                  className="w-full border border-gray-300 rounded-2xl px-4 py-3 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 text-sm"
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isLoading || rateLimitExceeded}
                className="bg-green-500 text-white w-12 h-12 rounded-full hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <span className="text-lg">📤</span>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}; 