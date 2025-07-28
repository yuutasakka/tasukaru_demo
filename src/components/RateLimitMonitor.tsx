import React, { useState, useEffect } from 'react';
import { captureException } from '../utils/sentry';

interface RateLimitStats {
  totalRequests: number;
  blockedRequests: number;
  topLimiters: Array<{ name: string; violations: number }>;
  recentViolations: Array<{
    timestamp: string;
    ip: string;
    endpoint: string;
    limiter: string;
  }>;
}

interface RateLimitConfig {
  name: string;
  windowMs: number;
  maxRequests: number;
  currentRequests: number;
  enabled: boolean;
}

const RateLimitMonitor: React.FC = () => {
  const [stats, setStats] = useState<RateLimitStats>({
    totalRequests: 0,
    blockedRequests: 0,
    topLimiters: [],
    recentViolations: []
  });
  const [configs, setConfigs] = useState<RateLimitConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30秒ごとに更新
    return () => clearInterval(interval);
  }, [selectedTimeRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // レート制限統計の取得
      const statsResponse = await fetch(`/api/admin/rate-limit/stats?timeRange=${selectedTimeRange}`);
      if (!statsResponse.ok) throw new Error('Failed to fetch stats');
      const statsData = await statsResponse.json();
      setStats(statsData);
      
      // レート制限設定の取得
      const configsResponse = await fetch('/api/admin/rate-limit/configs');
      if (!configsResponse.ok) throw new Error('Failed to fetch configs');
      const configsData = await configsResponse.json();
      setConfigs(configsData);
      
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      captureException(err as Error, { context: 'RateLimitMonitor' });
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (configName: string, updates: Partial<RateLimitConfig>) => {
    try {
      const response = await fetch(`/api/admin/rate-limit/configs/${configName}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error('Failed to update config');
      
      await fetchData(); // 更新後にデータを再取得
    } catch (err) {
      captureException(err as Error, { context: 'RateLimitConfig' });
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const clearViolations = async (ip?: string) => {
    try {
      const url = ip ? `/api/admin/rate-limit/clear/${ip}` : '/api/admin/rate-limit/clear';
      const response = await fetch(url, { method: 'POST' });
      
      if (!response.ok) throw new Error('Failed to clear violations');
      
      await fetchData();
    } catch (err) {
      captureException(err as Error, { context: 'ClearViolations' });
      setError(err instanceof Error ? err.message : 'Clear failed');
    }
  };

  if (loading && stats.totalRequests === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          エラー: {error}
        </div>
      )}

      {/* 概要統計 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">
            {stats.totalRequests.toLocaleString()}
          </div>
          <div className="text-gray-600">総リクエスト数</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-red-600">
            {stats.blockedRequests.toLocaleString()}
          </div>
          <div className="text-gray-600">ブロックされたリクエスト</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-yellow-600">
            {stats.totalRequests > 0 ? 
              ((stats.blockedRequests / stats.totalRequests) * 100).toFixed(1) 
              : '0.0'
            }%
          </div>
          <div className="text-gray-600">ブロック率</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">
            {configs.filter(c => c.enabled).length}
          </div>
          <div className="text-gray-600">有効な制限ルール</div>
        </div>
      </div>

      {/* 時間範囲選択 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">監視期間</h3>
          <select 
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1"
          >
            <option value="1h">過去1時間</option>
            <option value="24h">過去24時間</option>
            <option value="7d">過去7日間</option>
            <option value="30d">過去30日間</option>
          </select>
        </div>
      </div>

      {/* レート制限設定 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">レート制限設定</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  名前
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  時間窓
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  最大リクエスト
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  現在のリクエスト
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  状態
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {configs.map((config) => (
                <tr key={config.name}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {config.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {config.windowMs / 1000 / 60}分
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {config.maxRequests}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <span className={`mr-2 ${config.currentRequests > config.maxRequests * 0.8 ? 'text-red-600' : 'text-green-600'}`}>
                        {config.currentRequests}
                      </span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            config.currentRequests > config.maxRequests * 0.8 
                              ? 'bg-red-500' 
                              : 'bg-green-500'
                          }`}
                          style={{ 
                            width: `${Math.min((config.currentRequests / config.maxRequests) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => updateConfig(config.name, { enabled: !config.enabled })}
                      className={`px-2 py-1 text-xs rounded-full ${
                        config.enabled 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {config.enabled ? '有効' : '無効'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => clearViolations()}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      リセット
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 最近の違反 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">最近の制限違反</h3>
          <button
            onClick={() => clearViolations()}
            className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
          >
            すべてクリア
          </button>
        </div>
        
        {stats.recentViolations.length === 0 ? (
          <p className="text-gray-500">違反はありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    時刻
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    IPアドレス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    エンドポイント
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    制限タイプ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.recentViolations.slice(0, 20).map((violation, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(violation.timestamp).toLocaleString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {violation.ip}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {violation.endpoint}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                        {violation.limiter}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => clearViolations(violation.ip)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        IP解除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RateLimitMonitor;