// 管理画面用のヘルパー関数

import { secureLog } from '@/config/clientSecurity';

/**
 * 共通エラー処理ヘルパー
 */
export const createErrorHandler = (
  setGlobalError: (error: string) => void,
  setGlobalLoading: (loading: boolean) => void
) => {
  return (error: any, userMessage: string, logContext?: string) => {
    const errorMsg = error?.message || error?.toString() || 'Unknown error';
    secureLog(`${logContext || 'Error'}:`, errorMsg);
    setGlobalError(userMessage);
    setGlobalLoading(false);
    // 5秒後にエラーメッセージを自動で消す
    setTimeout(() => setGlobalError(''), 5000);
  };
};

/**
 * 成功メッセージ表示ヘルパー
 */
export const createSuccessHandler = (
  setGlobalSuccess: (success: string) => void,
  setGlobalError: (error: string) => void
) => {
  return (message: string) => {
    setGlobalSuccess(message);
    setGlobalError('');
    // 3秒後に成功メッセージを自動で消す
    setTimeout(() => setGlobalSuccess(''), 3000);
  };
};

/**
 * メッセージクリアヘルパー
 */
export const createMessageClearer = (
  setGlobalError: (error: string) => void,
  setGlobalSuccess: (success: string) => void
) => {
  return () => {
    setGlobalError('');
    setGlobalSuccess('');
  };
};

/**
 * セッション有効性チェック
 */
export const checkSessionValidity = (
  SecureStorage: any,
  setSessionValid: (valid: boolean) => void
): boolean => {
  try {
    const session = SecureStorage.getSecureItem('admin_session');
    if (!session) {
      setSessionValid(false);
      return false;
    }

    const currentTime = new Date().toISOString();
    const expiryTime = session.expiryTime;

    if (currentTime > expiryTime) {
      secureLog('セッションが期限切れです');
      setSessionValid(false);
      return false;
    }

    setSessionValid(true);
    return true;
  } catch (error) {
    secureLog('セッションデータの解析エラー:', error);
    setSessionValid(false);
    return false;
  }
};

/**
 * セッション延長
 */
export const extendSession = (
  SecureStorage: any,
  setSessionTimeRemaining: (time: number) => void
) => {
  try {
    const session = SecureStorage.getSecureItem('admin_session');
    if (session) {
      session.expires = Date.now() + (30 * 60 * 1000); // 30分延長
      SecureStorage.setSecureItem('admin_session', session);
      setSessionTimeRemaining(30 * 60 * 1000);
    }
  } catch (error) {
    secureLog('セッション延長エラー:', error);
  }
};

/**
 * セッション時間の残り時間計算
 */
export const calculateSessionTimeRemaining = (session: any): number => {
  if (!session || !session.expiryTime) return 0;
  
  const currentTime = new Date().getTime();
  const expiryTime = new Date(session.expiryTime).getTime();
  const remaining = Math.max(0, expiryTime - currentTime);
  
  return remaining;
};

/**
 * 時間のフォーマット（mm:ss）
 */
export const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * ダッシュボード統計の計算
 */
export const calculateDashboardStats = (sessions: any[]): any => {
  if (!sessions || sessions.length === 0) {
    return {
      totalDiagnoses: 0,
      diagnosesLast7Days: 0,
      averageInvestmentAmount: 0,
      mostCommonPurpose: 'データなし',
      ageDistribution: {}
    };
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 過去7日間の診断数
  const recentSessions = sessions.filter(session => {
    const sessionDate = new Date(session.timestamp);
    return sessionDate >= sevenDaysAgo;
  });

  // 平均投資金額
  const investmentAmounts = sessions
    .map(session => session.diagnosisAnswers?.investmentAmount)
    .filter(amount => amount && !isNaN(Number(amount)))
    .map(amount => Number(amount));

  const averageInvestmentAmount = investmentAmounts.length > 0
    ? Math.round(investmentAmounts.reduce((sum, amount) => sum + amount, 0) / investmentAmounts.length)
    : 0;

  // 最も多い投資目的
  const purposes = sessions
    .map(session => session.diagnosisAnswers?.investmentPurpose)
    .filter(purpose => purpose);

  const purposeCount: Record<string, number> = {};
  purposes.forEach(purpose => {
    purposeCount[purpose] = (purposeCount[purpose] || 0) + 1;
  });

  const mostCommonPurpose = Object.keys(purposeCount).length > 0
    ? Object.keys(purposeCount).reduce((a, b) => purposeCount[a] > purposeCount[b] ? a : b)
    : 'データなし';

  // 年代分布
  const ages = sessions
    .map(session => session.diagnosisAnswers?.age)
    .filter(age => age);

  const ageRanges: Record<string, number> = {
    '20代': 0,
    '30代': 0,
    '40代': 0,
    '50代': 0,
    '60代以上': 0
  };

  ages.forEach(age => {
    const ageNum = Number(age);
    if (ageNum >= 20 && ageNum < 30) ageRanges['20代']++;
    else if (ageNum >= 30 && ageNum < 40) ageRanges['30代']++;
    else if (ageNum >= 40 && ageNum < 50) ageRanges['40代']++;
    else if (ageNum >= 50 && ageNum < 60) ageRanges['50代']++;
    else if (ageNum >= 60) ageRanges['60代以上']++;
  });

  const totalAges = Object.values(ageRanges).reduce((sum, count) => sum + count, 0);
  const ageDistribution: Record<string, string> = {};
  
  if (totalAges > 0) {
    Object.keys(ageRanges).forEach(range => {
      const percentage = Math.round((ageRanges[range] / totalAges) * 100);
      ageDistribution[range] = `${percentage}%`;
    });
  }

  return {
    totalDiagnoses: sessions.length,
    diagnosesLast7Days: recentSessions.length,
    averageInvestmentAmount,
    mostCommonPurpose,
    ageDistribution
  };
};