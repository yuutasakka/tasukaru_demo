import React, { useState, useEffect } from 'react';
import { diagnosisManager } from './supabaseClient';

interface OneTimeUsageNoticeProps {
  onDismiss: () => void;
}

export const OneTimeUsageNotice: React.FC<OneTimeUsageNoticeProps> = ({ onDismiss }) => {
  const [completedSessions, setCompletedSessions] = useState<number>(0);
  const [lastDiagnosisDate, setLastDiagnosisDate] = useState<string>('');

  useEffect(() => {
    const loadVerifiedSessions = async () => {
      try {
        const verifiedSessions = await diagnosisManager.getVerifiedSessions();
        
        setCompletedSessions(verifiedSessions.length);
        
        if (verifiedSessions.length > 0) {
          const latestSession = verifiedSessions[0]; // 既にverification_timestampでソート済み
          
          const date = new Date(latestSession.verification_timestamp);
          setLastDiagnosisDate(date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }));
        }
      } catch (error) {
      }
    };

    loadVerifiedSessions();
  }, []);

  if (completedSessions === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 transform animate-pulse">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-check-circle text-blue-600 text-2xl"></i>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            診断完了済み
          </h2>
          
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-gray-700 mb-2">
              <i className="fas fa-calendar-alt text-blue-600 mr-2"></i>
              最終診断日: <span className="font-semibold">{lastDiagnosisDate}</span>
            </p>
            <p className="text-gray-700">
              <i className="fas fa-chart-bar text-blue-600 mr-2"></i>
              完了回数: <span className="font-semibold">{completedSessions}回</span>
            </p>
          </div>
          
          <div className="text-gray-600 mb-6">
            <p className="mb-2">
              <i className="fas fa-info-circle text-orange-500 mr-2"></i>
              お一人様一回限りの診断サービスです
            </p>
            <p className="text-sm">
              より詳しいご相談をご希望の場合は、<br />
              専門のファイナンシャルプランナーまでお問い合わせください。
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={onDismiss}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              <i className="fas fa-home mr-2"></i>
              ホームに戻る
            </button>
            
            <a
              href="tel:0120-123-456"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 inline-block text-center"
            >
              <i className="fas fa-phone mr-2"></i>
              専門家に相談する
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}; 