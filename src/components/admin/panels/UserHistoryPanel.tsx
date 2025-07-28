import React, { useState, useEffect } from 'react';
import { UserSessionData } from '@/types';
import { AdminMessageHandlers } from '../AdminTypes';

interface UserHistoryPanelProps {
  sessions: UserSessionData[];
  messageHandlers: AdminMessageHandlers;
  onSessionsUpdate: (sessions: UserSessionData[]) => void;
}

const UserHistoryPanel: React.FC<UserHistoryPanelProps> = ({
  sessions,
  messageHandlers,
  onSessionsUpdate
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sessionsPerPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'completed' | 'incomplete'>('all');
  const [sortBy, setSortBy] = useState<'timestamp' | 'name' | 'phone'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedSession, setSelectedSession] = useState<UserSessionData | null>(null);

  // フィルタリングと検索
  const filteredSessions = sessions.filter(session => {
    const matchesSearch = 
      (session.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.phoneNumber.includes(searchTerm) ||
      (session.email && session.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter = 
      filterType === 'all' ||
      (filterType === 'completed' && session.diagnosisResult) ||
      (filterType === 'incomplete' && !session.diagnosisResult);

    return matchesSearch && matchesFilter;
  });

  // ソート
  const sortedSessions = [...filteredSessions].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortBy) {
      case 'timestamp':
        aValue = new Date(a.timestamp).getTime();
        bValue = new Date(b.timestamp).getTime();
        break;
      case 'name':
        aValue = (a.userName || '').toLowerCase();
        bValue = (b.userName || '').toLowerCase();
        break;
      case 'phone':
        aValue = a.phoneNumber;
        bValue = b.phoneNumber;
        break;
      default:
        aValue = a.timestamp;
        bValue = b.timestamp;
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // ページネーション
  const indexOfLastSession = currentPage * sessionsPerPage;
  const indexOfFirstSession = indexOfLastSession - sessionsPerPage;
  const currentSessions = sortedSessions.slice(indexOfFirstSession, indexOfLastSession);
  const totalPages = Math.ceil(sortedSessions.length / sessionsPerPage);

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('この診断データを削除してもよろしいですか？')) return;

    try {
      const updatedSessions = sessions.filter(session => session.id !== sessionId);
      onSessionsUpdate(updatedSessions);
      messageHandlers.showSuccess('診断データが削除されました');
    } catch (error) {
      messageHandlers.handleError(error, '診断データの削除に失敗しました');
    }
  };

  const handleExportSessions = () => {
    try {
      const csvContent = generateCSVContent(filteredSessions);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `user_sessions_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      messageHandlers.showSuccess('データをエクスポートしました');
    } catch (error) {
      messageHandlers.handleError(error, 'データのエクスポートに失敗しました');
    }
  };

  const generateCSVContent = (sessions: UserSessionData[]): string => {
    const headers = [
      'ID', '名前', '電話番号', 'メール', '診断日時', '年齢', '投資金額', 
      '投資目的', '投資期間', 'リスク許容度', '診断結果', '備考'
    ];

    const csvRows = sessions.map(session => [
      session.id,
      session.userName,
      session.phoneNumber,
      session.email || '',
      new Date(session.timestamp).toLocaleString('ja-JP'),
      session.diagnosisAnswers?.age || '',
      session.diagnosisAnswers?.investmentAmount || '',
      session.diagnosisAnswers?.investmentPurpose || '',
      session.diagnosisAnswers?.investmentPeriod || '',
      session.diagnosisAnswers?.riskTolerance || '',
      session.diagnosisResult?.recommendedProducts?.map((p: any) => p.name).join('; ') || '',
      session.notes || ''
    ]);

    return [headers, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (session: UserSessionData) => {
    if (session.diagnosisResult) {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
          診断完了
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
          未完了
        </span>
      );
    }
  };

  return (
    <div className="user-history-panel">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">ユーザー診断履歴</h2>
        <button
          onClick={handleExportSessions}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
        >
          <i className="fas fa-download mr-2"></i>
          CSV出力
        </button>
      </div>

      {/* フィルター・検索 */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">検索</label>
            <input
              type="text"
              placeholder="名前、電話番号、メール"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'completed' | 'incomplete')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">すべて</option>
              <option value="completed">診断完了</option>
              <option value="incomplete">未完了</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">並び順</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'timestamp' | 'name' | 'phone')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="timestamp">日時順</option>
              <option value="name">名前順</option>
              <option value="phone">電話番号順</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">順序</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="desc">降順</option>
              <option value="asc">昇順</option>
            </select>
          </div>
        </div>
      </div>

      {/* 統計情報 */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800">総診断数</h3>
          <p className="text-2xl font-bold text-blue-900">{sessions.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-green-800">完了数</h3>
          <p className="text-2xl font-bold text-green-900">
            {sessions.filter(s => s.diagnosisResult).length}
          </p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-800">未完了数</h3>
          <p className="text-2xl font-bold text-yellow-900">
            {sessions.filter(s => !s.diagnosisResult).length}
          </p>
        </div>
      </div>

      {/* セッション一覧 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ユーザー情報
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                診断日時
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                投資金額
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentSessions.map((session) => (
              <tr key={session.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{session.userName}</div>
                    <div className="text-sm text-gray-500">{session.phoneNumber}</div>
                    {session.email && (
                      <div className="text-sm text-gray-500">{session.email}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(session.timestamp)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(session)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {session.diagnosisAnswers?.investmentAmount ? 
                    `${parseInt(session.diagnosisAnswers.investmentAmount).toLocaleString()}万円` : 
                    '-'
                  }
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => setSelectedSession(session)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    詳細
                  </button>
                  <button
                    onClick={() => handleDeleteSession(session.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              前へ
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                  page === currentPage
                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              次へ
            </button>
          </nav>
        </div>
      )}

      {/* 詳細モーダル */}
      {selectedSession && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">診断詳細</h3>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">基本情報</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">名前:</span> {selectedSession.userName}</p>
                      <p><span className="font-medium">電話:</span> {selectedSession.phoneNumber}</p>
                      {selectedSession.email && (
                        <p><span className="font-medium">メール:</span> {selectedSession.email}</p>
                      )}
                      <p><span className="font-medium">診断日時:</span> {formatDate(selectedSession.timestamp)}</p>
                    </div>
                  </div>
                  
                  {selectedSession.diagnosisAnswers && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">診断回答</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">年齢:</span> {selectedSession.diagnosisAnswers.age}</p>
                        <p><span className="font-medium">投資金額:</span> {selectedSession.diagnosisAnswers.investmentAmount}万円</p>
                        <p><span className="font-medium">投資目的:</span> {selectedSession.diagnosisAnswers.investmentPurpose}</p>
                        <p><span className="font-medium">投資期間:</span> {selectedSession.diagnosisAnswers.investmentPeriod}</p>
                        <p><span className="font-medium">リスク許容度:</span> {selectedSession.diagnosisAnswers.riskTolerance}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {selectedSession.diagnosisResult && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">診断結果</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm mb-2">{selectedSession.diagnosisResult.summary}</p>
                      {selectedSession.diagnosisResult.recommendedProducts && (
                        <div>
                          <h5 className="font-medium text-sm mb-2">推奨商品:</h5>
                          <ul className="text-sm space-y-1">
                            {selectedSession.diagnosisResult.recommendedProducts.map((product: any, index: number) => (
                              <li key={index} className="flex items-center">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                {product.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserHistoryPanel;