import React, { useState, useEffect, lazy, Suspense } from 'react';
import ErrorBoundary from './src/components/ErrorBoundary';
import Header from './src/components/Header';
// 要件定義書に基づく新しいコンポーネント
import Hero from './src/components/Hero';
import DiagnosisForm from './src/components/DiagnosisForm';
// 診断回答の型定義
type DiagnosisAnswers = {
  age: string;
  experience: string;
  purpose: string;
  amount: string;
  timing: string;
  phone?: string;
};
import SMSAuthFlow from './src/components/SMSAuthFlow';
import ReliabilitySection from './src/components/ReliabilitySection';
import SecurityTrustSection from './src/components/SecurityTrustSection';
import CallToActionSection from './src/components/CallToActionSection';
import Footer from './src/components/Footer';
import FixedCTA from './src/components/FixedCTA';
import CombatPowerResults from './src/components/CombatPowerResults';
import FAQSection from './src/components/FAQSection';

// 動的インポート（Code Splitting）
const PhoneVerificationPage = lazy(() => import('./src/components/PhoneVerificationPage'));
const DiagnosisResultsPage = lazy(() => import('./src/components/DiagnosisResultsPage'));
const AdminLoginPage = lazy(() => import('./src/components/AdminLoginPage'));
const AdminDashboardPage = lazy(() => import('./src/components/AdminDashboardPage'));
// 新しいSupabase Auth関連の動的インポート
const SupabaseAuthLogin = lazy(() => import('./src/components/SupabaseAuthLogin').then(module => ({ default: module.SupabaseAuthLogin })));
const LoginSelectionPage = lazy(() => import('./src/components/LoginSelectionPage'));
const RegistrationRequestPage = lazy(() => import('./src/components/RegistrationRequestPage'));
const AdminPasswordResetPage = lazy(() => import('./src/components/AdminPasswordResetPage'));

// 基本コンポーネント（即時読み込み）
import { OneTimeUsageNotice } from './src/components/OneTimeUsageNotice';
import { supabase } from './src/components/supabaseClient';
import type { User } from '@supabase/supabase-js';
import { ColorThemeProvider } from './src/components/ColorThemeContext';
import { DesignSettingsProvider } from './src/contexts/DesignSettingsContext';
import TemplateStyleProvider from './src/components/TemplateStyleProvider';
import { DiagnosisFormState, PageView } from './types';
import { initializeSampleData } from './data/sampleData';
import ProductionSecurityValidator from './src/components/ProductionSecurityValidator';
import { measurePageLoad } from './src/components/PerformanceMonitor';
import PWAInstallPrompt from './src/components/PWAInstallPrompt';
import PWAUpdatePrompt from './src/components/PWAUpdatePrompt';
import SEOHead from './src/components/SEOHead';
import { HelmetProvider } from 'react-helmet-async';
import { AccessibilityProvider } from './src/components/AccessibilityProvider';
import SkipLinks from './src/components/SkipLinks';
import AccessibilityAnnouncer from './src/components/AccessibilityAnnouncer';

// ローディングコンポーネント（アニメーションなし）
const LoadingSpinner = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    background: '#2C3E50' // 戦闘力をイメージした深いグレー
  }}>
    <div style={{
      width: '60px',
      height: '60px',
      border: '4px solid #F39C12', // 金色のアクセント
      borderRadius: '4px',
      backgroundColor: '#E74C3C', // 戦闘を象徴する赤
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontWeight: 'bold',
      fontSize: '12px'
    }}>
      読込中
    </div>
  </div>
);

const App: React.FC = () => {
  // 要件定義書に基づくページ状態の更新
  const [currentPage, setCurrentPage] = useState<PageView>('home'); // 'diagnosis' -> 'home'に変更
  const [phoneNumberToVerify, setPhoneNumberToVerify] = useState<string | null>(null);
  const [diagnosisData, setDiagnosisData] = useState<DiagnosisFormState | null>(null);
  // 新しい診断答えの状態
  const [diagnosisAnswers, setDiagnosisAnswers] = useState<DiagnosisAnswers | null>(null);
  // 生の診断回答を保存（新しい戦闘力診断用）
  const [rawDiagnosisAnswers, setRawDiagnosisAnswers] = useState<Record<number, string> | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [showUsageNotice, setShowUsageNotice] = useState<boolean>(false);
  
  // 新しいSupabase Auth関連の状態
  const [, setSupabaseUser] = useState<User | null>(null);
  const [isSupabaseAuth, setIsSupabaseAuth] = useState(false);
  
  // 状態変更を監視するuseEffect
  useEffect(() => {
    // 状態変更の処理（ログ出力は本番環境では無効）
  }, [isAdminLoggedIn, isSupabaseAuth]);


  useEffect(() => {
    // Apply body class for verification and results pages for consistent styling
    if (currentPage === 'verification' || currentPage === 'results' || currentPage === 'loginSelection' || currentPage === 'traditionalLogin' || currentPage === 'supabaseLogin' || currentPage === 'adminDashboard') {
      document.body.classList.add('verification-page-active'); // This class now applies premium dark gradient
    } else {
      document.body.classList.remove('verification-page-active');
      document.body.style.fontFamily = 'var(--font-primary)'; // Ensure main pages use Inter
    }
    // Cleanup function
    return () => {
      document.body.classList.remove('verification-page-active');
    };
  }, []);

  // Supabase認証状態の監視
  useEffect(() => {
    const initSupabaseAuth = async () => {
      try {
        // 現在のセッションを取得
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setSupabaseUser(session.user);
          setIsSupabaseAuth(true);
          setIsAdminLoggedIn(true);
          
          // プロファイルからパスワード変更要求をチェック
          await supabase
            .from('profiles')
            .select('requires_password_change')
            .eq('id', session.user.id)
            .single();

          // パスワード変更機能は現在無効化されているため、常に管理画面に遷移
          setCurrentPage('adminDashboard');
        }

        // 管理者認証状態の監視（一般ユーザーとは完全分離）
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            
            if (session?.user) {
              // 管理者専用のSupabase認証のみを処理
              // 一般ユーザーのSMS認証とは完全に分離
              
              // 管理者認証情報の確認（複数フィールドで安全に照合）
              let adminData = null;
              let adminError = null;
              
              // 1. メールアドレスでの照合
              if (session.user.email) {
                const { data, error } = await supabase
                  .from('admin_credentials')
                  .select('*')
                  .eq('username', session.user.email)
                  .eq('is_active', true)
                  .maybeSingle();
                if (data) { adminData = data; adminError = error; }
              }
              
              // 2. 電話番号での照合（メールで見つからない場合）
              if (!adminData && session.user.phone) {
                const { data, error } = await supabase
                  .from('admin_credentials')
                  .select('*')
                  .eq('phone_number', session.user.phone)
                  .eq('is_active', true)
                  .maybeSingle();
                if (data) { adminData = data; adminError = error; }
              }
              
              if (adminData && !adminError) {
                // 正当な管理者の場合のみ権限付与
                setSupabaseUser(session.user);
                setIsSupabaseAuth(true);
                setIsAdminLoggedIn(true);
                setCurrentPage('adminDashboard');
              } else {
                // 管理者でない場合は認証を拒否
                await supabase.auth.signOut();
                setSupabaseUser(null);
                setIsSupabaseAuth(false);
                setIsAdminLoggedIn(false);
                setCurrentPage('home');
              }
            } else {
              setSupabaseUser(null);
              // Supabase認証が解除された場合のみ状態をリセット
              if (isSupabaseAuth) {
                setIsSupabaseAuth(false);
                setIsAdminLoggedIn(false);
                setCurrentPage('home');
              }
            }
          }
        );

        return () => subscription.unsubscribe();
      } catch (error) {
        // Supabase認証初期化エラーは無視（フォールバック認証が動作）
        return () => {}; // クリーンアップ関数を提供
      }
    };

    const cleanup = initSupabaseAuth();
    return () => {
      if (cleanup && typeof cleanup.then === 'function') {
        cleanup.then(cleanupFn => {
          if (cleanupFn && typeof cleanupFn === 'function') {
            cleanupFn();
          }
        });
      }
    };
  }, []);



  // 🔐 セッション管理とページ閉じる時の処理
  useEffect(() => {
    // ページ読み込み時にセッション状態をチェック・クリーンアップ
    const initializeSessionState = () => {
      try {
        // 不正なセッション状態をクリア
        const sessionAuth = sessionStorage.getItem('admin_authenticated');
        const adminSession = sessionStorage.getItem('admin_session');
        
        const forceLoggedIn = sessionStorage.getItem('force_admin_logged_in');
        
        if (sessionAuth === 'true' && adminSession && forceLoggedIn === 'true') {
          // セッションの有効期限をチェック
          const session = JSON.parse(adminSession);
          const now = Date.now();
          
          // expiryTimeがある場合のみ有効期限をチェック
          if (session.expiryTime && now > new Date(session.expiryTime).getTime()) {
            // 期限切れセッションをクリア
            sessionStorage.removeItem('admin_authenticated');
            sessionStorage.removeItem('admin_session');
            sessionStorage.removeItem('force_admin_logged_in');
            setIsAdminLoggedIn(false);
            if (currentPage === 'adminDashboard') {
              setCurrentPage('home');
            }
          } else if (session.username === 'admin' || session.authenticated === true) {
            // 有効なセッションが存在する場合のみ
            setIsAdminLoggedIn(true);
            if (currentPage !== 'adminDashboard') {
              setCurrentPage('adminDashboard');
            }
          }
        } else {
          // 不完全なセッション情報をクリア
          sessionStorage.removeItem('admin_authenticated');
          sessionStorage.removeItem('admin_session');
          sessionStorage.removeItem('force_admin_logged_in');
          setIsAdminLoggedIn(false);
        }
      } catch (error) {
        // エラー時は全セッション情報をクリア
        sessionStorage.clear();
        sessionStorage.removeItem('admin_session');
        sessionStorage.removeItem('force_admin_logged_in');
        setIsAdminLoggedIn(false);
        setCurrentPage('home');
      }
    };

    // ページを閉じる時の処理
    const handleBeforeUnload = () => {
      // セッションストレージの一時情報をクリア（ローカルストレージの認証情報は保持）
      sessionStorage.removeItem('admin_authenticated');
    };

    // ページの可視性変更時の処理（タブの切り替えなど）
    const handleVisibilityChange = () => {
      // 現在の認証状態をその場で取得
      const currentAuth = sessionStorage.getItem('admin_authenticated') === 'true';
      
      if (document.hidden && currentAuth) {
        // ページが非表示になった時、セッション時間を記録
        const sessionData = {
          lastActivity: Date.now(),
          isLoggedIn: currentAuth
        };
        sessionStorage.setItem('admin_session_state', JSON.stringify(sessionData));
      } else if (!document.hidden) {
        // ページが再び表示された時、セッション状態をチェック
        const sessionState = sessionStorage.getItem('admin_session_state');
        if (sessionState) {
          try {
            const data = JSON.parse(sessionState);
            const timeDiff = Date.now() - data.lastActivity;
            
            // 30分以上非アクティブの場合はログアウト
            if (timeDiff > 30 * 60 * 1000) {
              sessionStorage.clear();
              sessionStorage.removeItem('admin_session');
              setIsAdminLoggedIn(false);
              setCurrentPage('diagnosis');
            }
          } catch (error) {
            // セッション状態パースエラーの場合はクリア
            sessionStorage.clear();
          }
        }
      }
    };

    // イベントリスナー登録
    initializeSessionState();
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // 初回のみ実行

  useEffect(() => {
    // アプリケーション初期化：サンプルデータとスクリプト読み込み
    const initializeApp = () => {
      try {
        // サンプルデータの初期化
        initializeSampleData();

        // 診断完了履歴チェック機能を無効化
        // 電話番号認証時のみポップアップを表示するように変更済み

        // トラッキングスクリプトはSupabaseから直接読み込み（管理画面設定から）
        // ここではlocalStorageに依存しない実装
      } catch (e) {
        // アプリケーション初期化エラーは無視（基本機能は動作する）
      }
    };

    initializeApp();
  }, []); // Empty dependency array means this runs once on mount

  // 要件定義書に基づく新しいナビゲーション関数
  const handleStartDiagnosis = () => {
    // 診断フォームへのスムーズスクロール（新しいレイアウト対応）
    const diagnosisSection = document.getElementById('diagnosis-form-section');
    if (diagnosisSection) {
      // ヘッダー分のオフセット
      const yOffset = -80;
      const elementPosition = diagnosisSection.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset + yOffset;

      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth'
      });
      
      // フォームにフォーカスを当てるアニメーション効果
      const diagnosisElement = diagnosisSection.querySelector('.home-right-col');
      if (diagnosisElement) {
        setTimeout(() => {
          diagnosisElement.classList.add('diagnosis-focus-animation');
          
          // 最初の質問の入力要素にフォーカス
          const firstInput = diagnosisElement.querySelector('button, input, select');
          if (firstInput) {
            (firstInput as HTMLElement).focus();
          }
          
          setTimeout(() => {
            diagnosisElement.classList.remove('diagnosis-focus-animation');
          }, 1500);
        }, 700);
      }
    }
  };

  const handleDiagnosisComplete = (answers: DiagnosisAnswers) => {
    setDiagnosisAnswers(answers);
    setCurrentPage('smsAuth');
  };

  const handleDiagnosisCancel = () => {
    setCurrentPage('home');
    setDiagnosisAnswers(null);
  };

  const handleSMSAuthComplete = (phoneNumber: string) => {
    setPhoneNumberToVerify(phoneNumber);
    // 診断データを従来の形式に変換（既存のDiagnosisResultsPageとの互換性のため）
    if (diagnosisAnswers) {
      const legacyDiagnosisData: DiagnosisFormState = {
        age: diagnosisAnswers.age || '',
        investmentExperience: diagnosisAnswers.experience || '',
        investmentGoal: diagnosisAnswers.purpose || '',
        monthlyInvestment: diagnosisAnswers.amount || '',
        investmentHorizon: diagnosisAnswers.timing || '',
        // 既存のフィールドもデフォルト値で埋める
        annualIncome: '',
        riskTolerance: '',
        investmentPreference: '',
        financialKnowledge: ''
      };
      setDiagnosisData(legacyDiagnosisData);
    }
    setCurrentPage('results');
    return; // 明示的なreturn追加
  };

  const handleSMSAuthCancel = () => {
    setCurrentPage('diagnosis');
  };

  // 既存のハンドラー（後方互換性のため保持）
  const handleVerificationComplete = () => {
    setCurrentPage('results');
    window.scrollTo(0, 0);
  };

  const handleVerificationCancel = () => {
    setCurrentPage('home'); 
    window.scrollTo(0,0);
  }

  const handleReturnToStart = () => {
    setPhoneNumberToVerify(null);
    setDiagnosisData(null);
    setDiagnosisAnswers(null);
    setRawDiagnosisAnswers(null);
    if (isAdminLoggedIn) {
        setIsAdminLoggedIn(false);
    }
    setCurrentPage('home');
    window.scrollTo(0,0);
  }

  const handleAdminLoginSuccess = () => {
    // セッション情報を設定
    const adminSession = sessionStorage.getItem('admin_session');
    if (adminSession) {
      sessionStorage.setItem('admin_authenticated', 'true');
      
      // 管理者ログイン状態を強制的に維持
      sessionStorage.setItem('force_admin_logged_in', 'true');
      
      // 状態を同期的に更新
      setIsAdminLoggedIn(true);
      setCurrentPage('adminDashboard');
      
    } else {
      // セッションがない場合はログイン失敗として扱う
      setIsAdminLoggedIn(false);
      setCurrentPage('traditionalLogin');
    }
    
    window.scrollTo(0,0);
  };

  const handleAdminLogout = async () => {
    // 全ての認証状態をクリア
    setIsAdminLoggedIn(false);
    setIsSupabaseAuth(false);
    setSupabaseUser(null);
    
    if (isSupabaseAuth) {
      // Supabase認証の場合
      try {
        await supabase.auth.signOut();
      } catch (error) {
      }
    }
    
    // 全てのセッション関連データを強制クリア
    sessionStorage.clear();
    sessionStorage.removeItem('admin_session');
    sessionStorage.removeItem('force_admin_logged_in');
    sessionStorage.removeItem('admin_session_state');
    
    // 確実にログアウト状態を保証
    setCurrentPage('home');
    window.scrollTo(0,0);
  };
  
  const navigateToHome = () => {
    setCurrentPage('home');
    window.scrollTo(0,0);
  };

  const navigateToAdminLogin = () => {
    setCurrentPage('traditionalLogin');
    window.scrollTo(0,0);
  };

  const navigateToTraditionalLogin = () => {
    setCurrentPage('traditionalLogin');
    window.scrollTo(0,0);
  };

  const navigateToSupabaseLogin = () => {
    setCurrentPage('supabaseLogin');
    window.scrollTo(0,0);
  };

  // パスワードリセットページへのナビゲーション
  const navigateToPasswordReset = () => {
    setCurrentPage('passwordReset');
    window.scrollTo(0, 0);
  };

  // トップページのUIをDiagnosisFlow中心に変更
  const renderCurrentPage = () => {
    if (currentPage === 'home') {
      return (
        <ErrorBoundary>
          <div style={{ minHeight: '100vh', background: '#ffffff', padding: 0, margin: 0, width: '100%', maxWidth: '100vw', boxSizing: 'border-box', overflowX: 'hidden' }}>
          <Header />
          
          {/* 1番目: メインヒーロー（あなたの未来の資産を診断！） */}
          <div className="hero-section">
            <Hero onStartDiagnosis={handleStartDiagnosis} />
          </div>
          
          {/* 2番目: 診断フォーム */}
          <div className="diagnosis-section" id="diagnosis-form-section" style={{
            backgroundColor: '#F7F9FC',
            padding: '80px 20px',
            minHeight: '100vh'
          }}>
            <div className="home-right-col">
              <DiagnosisForm
                onComplete={(answers) => {
                  // 生の回答を保存（新しい戦闘力診断用）
                  setRawDiagnosisAnswers(answers);
                  
                  // 簡素化された回答を既存の形式に変換
                  const convertedAnswers: DiagnosisAnswers = {
                    age: answers[1] || '',
                    experience: answers[3] || '',
                    purpose: answers[4] || '',
                    amount: answers[2] || '',
                    timing: 'now',
                    phone: ''
                  };
                  
                  setDiagnosisAnswers(convertedAnswers);
                  
                  // 診断データを従来の形式に変換
                  const legacyDiagnosisData: DiagnosisFormState = {
                    age: convertedAnswers.age || '',
                    investmentExperience: convertedAnswers.experience || '',
                    investmentGoal: convertedAnswers.purpose || '',
                    monthlyInvestment: convertedAnswers.amount || '',
                    investmentHorizon: convertedAnswers.timing || '',
                    // 既存のフィールドもデフォルト値で埋める
                    annualIncome: '',
                    riskTolerance: '',
                    investmentPreference: '',
                    financialKnowledge: ''
                  };
                  setDiagnosisData(legacyDiagnosisData);
                  
                  setCurrentPage('smsAuth');
                }}
              />
            </div>
          </div>
          
          {/* 3番目: FAQセクション */}
          <FAQSection />
          
          {/* 4番目以降: その他のセクション */}
          <div className="additional-sections">
            <ReliabilitySection />
            <SecurityTrustSection />
            <CallToActionSection />
          </div>
          
          <Footer onNavigateToAdminLogin={navigateToAdminLogin} />
          <style>{`
            /* 診断フォーカス効果（戦闘力テーマ） */
            .diagnosis-focus-animation {
              box-shadow: 0 10px 20px rgba(231, 76, 60, 0.3);
              border: 2px solid #E74C3C;
              background: linear-gradient(135deg, #2C3E50 0%, #34495E 100%);
            }
            
            /* 新しい縦型レイアウト - 視認性向上 */
            .hero-section {
              width: 100%;
              padding: 0;
              background: transparent;
            }
            
            .diagnosis-section {
              width: 100%;
              padding: 80px 20px;
              display: flex;
              justify-content: center;
              position: relative;
            }
            
            .diagnosis-section::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 2px;
              background: linear-gradient(90deg, transparent, #E74C3C, #F39C12, #E74C3C, transparent);
            }
            
            .additional-sections {
              width: 100%;
              padding: 60px 20px;
              max-width: 1200px;
              margin: 0 auto;
              background: #ffffff;
            }
            
            .home-right-col {
              width: 100%;
              max-width: 900px;
              background: transparent;
              padding: 0;
            }
            
            /* タブレット対応 */
            @media (max-width: 1024px) and (min-width: 769px) {
              .hero-section {
                padding: 30px 0 15px 0;
              }
              
              .diagnosis-section {
                padding: 40px 20px;
              }
              
              .home-right-col {
                max-width: 600px;
                padding: 32px;
              }
              
              .additional-sections {
                padding: 40px 20px;
              }
            }
            
            /* スマートフォン（一般） */
            @media (max-width: 768px) {
              .hero-section {
                padding: 20px 0 10px 0;
              }
              
              .diagnosis-section {
                padding: 30px 16px;
              }
              
              .additional-sections {
                padding: 30px 16px;
              }
              
              .home-right-col {
                max-width: calc(100% - 32px);
                margin: 0 auto;
                padding: 24px;
                border-radius: 20px;
                box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
              }
            }
            
            /* スマートフォン（小画面） */
            @media (max-width: 480px) {
              .diagnosis-section {
                padding: 24px 12px;
              }
              
              .home-right-col {
                max-width: calc(100% - 24px);
                padding: 20px;
                border-radius: 16px;
                margin: 0 auto;
              }
              
              .additional-sections {
                padding: 24px 12px;
              }
            }
            
            /* 極小画面対応（iPhone SE等） */
            @media (max-width: 375px) {
              .hero-section {
                padding: 16px 0 8px 0;
              }
              
              .diagnosis-section {
                padding: 20px 10px;
              }
              
              .home-right-col {
                max-width: calc(100% - 20px);
                padding: 16px;
                margin: 0 auto;
                border-radius: 12px;
              }
              
              .additional-sections {
                padding: 20px 10px;
              }
            }
          `}</style>
        </div>
        </ErrorBoundary>
      );
    }
    // 管理者ログイン状態の場合（セキュリティ強化）
    const forceAdminLoggedIn = sessionStorage.getItem('force_admin_logged_in') === 'true';
    const sessionAuth = sessionStorage.getItem('admin_authenticated') === 'true';
    const adminSession = sessionStorage.getItem('admin_session');
    
    // セッション有効性の詳細チェック
    let isValidSession = false;
    if (adminSession && forceAdminLoggedIn) {
      try {
        const session = JSON.parse(adminSession);
        const now = Date.now();
        
        // セッションの有効期限をチェック
        if (session.expires && now <= session.expires) {
          isValidSession = true;
        } else if (!session.expires && session.authenticated === true) {
          // 有効期限がない場合は認証済みかどうかで判断
          isValidSession = true;
        } else {
          // 期限切れまたは無効なセッションをクリア
          sessionStorage.removeItem('admin_session');
          sessionStorage.removeItem('force_admin_logged_in');
          sessionStorage.removeItem('admin_authenticated');
        }
      } catch (error) {
        // 不正なセッションデータをクリア
        sessionStorage.removeItem('admin_session');
        sessionStorage.removeItem('force_admin_logged_in');
        sessionStorage.removeItem('admin_authenticated');
      }
    }
    
    // より厳密な認証チェック: 全ての条件が揃っている場合のみアクセス許可
    const actualAdminLoggedIn = isAdminLoggedIn && forceAdminLoggedIn && sessionAuth && isValidSession;
    const actualCurrentPage = actualAdminLoggedIn ? 'adminDashboard' : currentPage;
    
    
    if (actualAdminLoggedIn && actualCurrentPage === 'adminDashboard') {
      try {
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
              <AdminDashboardPage 
                onLogout={handleAdminLogout}
                onNavigateHome={navigateToHome}
              />
            </div>
          </Suspense>
        );
      } catch (error) {
        return (
          <div style={{ padding: '20px', backgroundColor: 'white', minHeight: '100vh' }}>
            <h1 style={{ color: 'red' }}>エラーが発生しました</h1>
            <p style={{ color: 'black' }}>管理者ダッシュボードの読み込み中にエラーが発生しました。</p>
            <pre style={{ color: 'red', fontSize: '12px' }}>{error?.toString()}</pre>
            <button 
              onClick={handleAdminLogout}
              style={{ 
                padding: '10px 20px', 
                backgroundColor: '#dc3545', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ログアウト
            </button>
          </div>
        );
      }
    }

    // 管理者関連ページ
    if (currentPage === 'loginSelection') {
      return (
        <Suspense fallback={<LoadingSpinner />}>
          <LoginSelectionPage 
            onSelectTraditionalAuth={navigateToTraditionalLogin}
            onSelectSupabaseAuth={navigateToSupabaseLogin}
            onNavigateHome={navigateToHome}
          />
        </Suspense>
      );
    }

    if (currentPage === 'traditionalLogin') {
      return (
        <Suspense fallback={<LoadingSpinner />}>
          <AdminLoginPage 
            onLogin={handleAdminLoginSuccess}
            onNavigateHome={navigateToHome}
            onNavigateToPasswordReset={navigateToPasswordReset}
          />
        </Suspense>
      );
    }

    if (currentPage === 'supabaseLogin') {
      return (
        <Suspense fallback={<LoadingSpinner />}>
          <SupabaseAuthLogin 
            onLogin={handleAdminLoginSuccess}
            onNavigateHome={navigateToHome} 
          />
        </Suspense>
      );
    }

    if (currentPage === 'registrationRequest') {
      return (
        <Suspense fallback={<LoadingSpinner />}>
          <RegistrationRequestPage onNavigateHome={navigateToHome} />
        </Suspense>
      );
    }

    if (currentPage === 'passwordReset') {
      return (
        <Suspense fallback={<LoadingSpinner />}>
          <AdminPasswordResetPage onNavigateBack={() => setCurrentPage('traditionalLogin')} />
        </Suspense>
      );
    }

    // 既存の電話認証ページ（後で削除予定）
    if (currentPage === 'verification') {
      return (
        <Suspense fallback={<LoadingSpinner />}>
          <PhoneVerificationPage
            userSession={{
              id: `verification-${Date.now()}`,
              timestamp: new Date().toISOString(),
              phoneNumber: phoneNumberToVerify || '',
              diagnosisAnswers: diagnosisData || {}
            }}
            onVerificationSuccess={handleVerificationComplete}
            onBack={handleVerificationCancel}
          />
        </Suspense>
      );
    }

    if (currentPage === 'results') {
      // 新しい戦闘力結果画面を使用
      // 生の診断回答を使用（rawDiagnosisAnswersが存在しない場合はデフォルト値）
      const answersToUse = rawDiagnosisAnswers || {
        1: '～300万円',
        2: '～10万円',
        3: '0件',
        4: '収入に対して返済が10%未満',
        5: '1ヶ月以内'
      };
      
      return (
        <CombatPowerResults
          diagnosisAnswers={answersToUse}
          onDownloadGuide={() => {
            // 攻略本ダウンロード処理（後で実装）
            // ここでPDFダウンロードまたはメール送信フォームを表示
            alert('攻略本のダウンロードリンクをメールで送信します。');
          }}
        />
      );
    }

    // 診断フォームページ
    if (currentPage === 'diagnosis') {
      return (
        <div style={{ 
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f0f4f8 0%, #ffffff 100%)',
          paddingTop: '80px'
        }}>
          <Header />
          <div style={{ paddingTop: '2rem' }}>
            <DiagnosisForm
              onComplete={(answers) => {
                // 生の回答を保存
                setRawDiagnosisAnswers(answers);
                
                // 簡素化された回答を既存の形式に変換
                const convertedAnswers: DiagnosisAnswers = {
                  age: answers[1] || '',
                  experience: answers[3] || '',
                  purpose: answers[4] || '',
                  amount: answers[2] || '',
                  timing: 'now',
                  phone: ''
                };
                
                handleDiagnosisComplete(convertedAnswers);
              }}
            />
          </div>
        </div>
      );
    }

    if (currentPage === 'smsAuth') {
      return (
        <SMSAuthFlow
          diagnosisAnswers={diagnosisAnswers!}
          onAuthComplete={handleSMSAuthComplete}
          onCancel={handleSMSAuthCancel}
        />
      );
    }

    // デフォルト: ホームページ（要件定義書準拠）
    return (
      <>
        <Header />
        <main>
          <Hero onStartDiagnosis={handleStartDiagnosis} />
          <ReliabilitySection />
          <SecurityTrustSection />
          <CallToActionSection />
        </main>
        <Footer onNavigateToAdminLogin={navigateToAdminLogin} />
        <FixedCTA onStartDiagnosis={handleStartDiagnosis} />
      </>
    );
  };

  // 一回限り診断の案内
  const usageNotice = showUsageNotice && (
    <OneTimeUsageNotice onDismiss={() => setShowUsageNotice(false)} />
  );

  if (process.env.NODE_ENV !== 'production') {
    measurePageLoad('トップ画面', 2000);
  }

  return (
    <HelmetProvider>
      <AccessibilityProvider>
          <DesignSettingsProvider>
            <ColorThemeProvider>
              <TemplateStyleProvider>
                <div className="App min-h-screen" style={{ background: '#ffffff' }}>
                  <SEOHead />
                  <SkipLinks />
                  <AccessibilityAnnouncer />
                  <ProductionSecurityValidator />
                  
                  <main id="main-content">
                    {renderCurrentPage()}
                  </main>
                  
                  {usageNotice}
                  <PWAInstallPrompt />
                  <PWAUpdatePrompt />
                  {/* <AccessibilityAudit /> */}
                </div>
              </TemplateStyleProvider>
            </ColorThemeProvider>
          </DesignSettingsProvider>
        </AccessibilityProvider>
    </HelmetProvider>
  );
};

export default App;