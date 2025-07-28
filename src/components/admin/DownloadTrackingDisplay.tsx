import React, { useState, useEffect } from 'react';

interface DownloadRecord {
  id: string;
  phone_number: string;
  email: string;
  is_downloaded: boolean;
  downloaded_at: string | null;
  created_at: string;
  expires_at: string;
  download_token: string;
}

interface DownloadStats {
  total: number;
  downloaded: number;
  notDownloaded: number;
  downloadRate: number;
}

export const DownloadTrackingDisplay: React.FC = () => {
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [stats, setStats] = useState<DownloadStats>({
    total: 0,
    downloaded: 0,
    notDownloaded: 0,
    downloadRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterDownloaded, setFilterDownloaded] = useState<string>('all');
  const [searchEmail, setSearchEmail] = useState('');
  const [searchPhone, setSearchPhone] = useState('');

  useEffect(() => {
    fetchDownloads();
  }, [currentPage, filterDownloaded, searchEmail, searchPhone]);

  const fetchDownloads = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50'
      });

      if (filterDownloaded !== 'all') {
        params.append('downloaded', filterDownloaded);
      }
      if (searchEmail) {
        params.append('email', searchEmail);
      }
      if (searchPhone) {
        params.append('phone', searchPhone);
      }
      
      const token = sessionStorage.getItem('adminToken');
      const response = await fetch(`/api/admin?action=get-download-stats&${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('ダウンロード統計の取得に失敗しました');
      }

      const data = await response.json();
      setDownloads(data.downloads);
      setStats(data.stats);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchDownloads();
  };

  const handleReset = () => {
    setSearchEmail('');
    setSearchPhone('');
    setFilterDownloaded('all');
    setCurrentPage(1);
  };

  if (loading && downloads.length === 0) {
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

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* 統計情報 */}
      <div className="p-6 border-b">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">ダウンロード統計</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-blue-600 text-sm font-medium">総登録数</p>
            <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-green-600 text-sm font-medium">ダウンロード済み</p>
            <p className="text-2xl font-bold text-green-700">{stats.downloaded}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-yellow-600 text-sm font-medium">未ダウンロード</p>
            <p className="text-2xl font-bold text-yellow-700">{stats.notDownloaded}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-purple-600 text-sm font-medium">ダウンロード率</p>
            <p className="text-2xl font-bold text-purple-700">{stats.downloadRate}%</p>
          </div>
        </div>
      </div>

      {/* フィルター */}
      <div className="p-6 border-b bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス検索
            </label>
            <input
              type="text"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="例: user@example"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              電話番号検索
            </label>
            <input
              type="text"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              placeholder="例: 090"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ダウンロード状態
            </label>
            <select
              value={filterDownloaded}
              onChange={(e) => setFilterDownloaded(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">すべて</option>
              <option value="true">ダウンロード済み</option>
              <option value="false">未ダウンロード</option>
            </select>
          </div>
          <div className="flex items-end space-x-2">
            <button
              onClick={handleSearch}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              検索
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              リセット
            </button>
          </div>
        </div>
      </div>

      {/* データテーブル */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                登録日時
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                電話番号
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                メールアドレス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状態
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ダウンロード日時
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                有効期限
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {downloads.map((download) => {
              const isExpired = new Date(download.expires_at) < new Date();
              return (
                <tr key={download.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(download.created_at).toLocaleString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {download.phone_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {download.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {download.is_downloaded ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        ダウンロード済み
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        未ダウンロード
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {download.downloaded_at 
                      ? new Date(download.downloaded_at).toLocaleString('ja-JP')
                      : '-'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={isExpired ? 'text-red-600' : 'text-gray-900'}>
                      {new Date(download.expires_at).toLocaleString('ja-JP')}
                      {isExpired && ' (期限切れ)'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
          <div className="text-sm text-gray-700">
            ページ {currentPage} / {totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              前へ
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              次へ
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-6 bg-red-50 border-t border-red-200">
          <p className="text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
};