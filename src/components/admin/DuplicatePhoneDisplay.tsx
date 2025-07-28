import React, { useState, useEffect } from 'react';

interface DuplicateRecord {
  phoneNumber: string;
  maskedPhone: string;
  count: number;
  firstDiagnosis?: string;
  lastDiagnosis?: string;
  records?: Array<{
    id: string;
    createdAt: string;
  }>;
}

export const DuplicatePhoneDisplay: React.FC = () => {
  const [duplicates, setDuplicates] = useState<{
    diagnosisResults: DuplicateRecord[];
    users: Array<{
      phoneNumber: string;
      maskedPhone: string;
      count: number;
      table: string;
    }>;
    summary: {
      totalDuplicatePhones: number;
      totalDuplicateRecords: number;
      userTableDuplicates: number;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPhone, setExpandedPhone] = useState<string | null>(null);

  useEffect(() => {
    fetchDuplicates();
  }, []);

  const fetchDuplicates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = sessionStorage.getItem('adminToken');
      const response = await fetch('/api/admin?action=get-duplicate-phones', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('重複データの取得に失敗しました');
      }

      const data = await response.json();
      setDuplicates(data.duplicates);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-6 border border-red-200">
        <h3 className="text-red-800 font-semibold mb-2">エラー</h3>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchDuplicates}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          再試行
        </button>
      </div>
    );
  }

  if (!duplicates || duplicates.diagnosisResults.length === 0) {
    return (
      <div className="bg-green-50 rounded-lg p-6 border border-green-200">
        <h3 className="text-green-800 font-semibold mb-2">重複なし</h3>
        <p className="text-green-600">重複している電話番号は見つかりませんでした。</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b">
        <h3 className="text-xl font-semibold text-gray-800">重複電話番号の検出</h3>
        <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
          <div className="bg-yellow-50 p-3 rounded">
            <p className="text-yellow-600 font-medium">重複電話番号数</p>
            <p className="text-2xl font-bold text-yellow-700">{duplicates.summary.totalDuplicatePhones}</p>
          </div>
          <div className="bg-orange-50 p-3 rounded">
            <p className="text-orange-600 font-medium">重複レコード総数</p>
            <p className="text-2xl font-bold text-orange-700">{duplicates.summary.totalDuplicateRecords}</p>
          </div>
          <div className="bg-red-50 p-3 rounded">
            <p className="text-red-600 font-medium">ユーザーテーブル重複</p>
            <p className="text-2xl font-bold text-red-700">{duplicates.summary.userTableDuplicates}</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <h4 className="font-medium text-gray-700 mb-4">診断結果テーブルの重複</h4>
        <div className="space-y-2">
          {duplicates.diagnosisResults.map((dup, index) => (
            <div key={index} className="border rounded-lg">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedPhone(expandedPhone === dup.phoneNumber ? null : dup.phoneNumber)}
              >
                <div className="flex items-center space-x-4">
                  <span className="font-mono text-lg">{dup.maskedPhone}</span>
                  <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                    {dup.count}回診断
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  初回: {new Date(dup.firstDiagnosis!).toLocaleDateString('ja-JP')} 
                  <span className="mx-2">→</span>
                  最新: {new Date(dup.lastDiagnosis!).toLocaleDateString('ja-JP')}
                </div>
                <svg 
                  className={`w-5 h-5 text-gray-400 transform transition-transform ${expandedPhone === dup.phoneNumber ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              
              {expandedPhone === dup.phoneNumber && dup.records && (
                <div className="border-t bg-gray-50 p-4">
                  <h5 className="font-medium text-sm text-gray-700 mb-2">診断履歴</h5>
                  <div className="space-y-1">
                    {dup.records.map((record, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">診断 {dup.records!.length - idx}</span>
                        <span className="text-gray-500">
                          {new Date(record.createdAt).toLocaleString('ja-JP')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {duplicates.users.length > 0 && (
          <>
            <h4 className="font-medium text-gray-700 mb-4 mt-8">ユーザーテーブルの重複</h4>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 font-medium mb-2">⚠️ データ整合性の問題</p>
              <p className="text-sm text-red-600 mb-3">
                ユーザーテーブルに重複する電話番号が存在します。データベースの制約を確認してください。
              </p>
              <div className="space-y-2">
                {duplicates.users.map((dup, index) => (
                  <div key={index} className="flex items-center justify-between bg-white p-3 rounded">
                    <span className="font-mono">{dup.maskedPhone}</span>
                    <span className="bg-red-600 text-white px-2 py-1 rounded text-sm">
                      {dup.count}件の重複
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};