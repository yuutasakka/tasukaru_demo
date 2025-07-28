// エンタープライズセキュリティダッシュボード
import React, { useState, useEffect } from 'react';
import { 
  EnterpriseSecurityManager, 
  SecurityMetrics, 
  SecurityHealthCheck, 
  ThreatAssessment,
  SecurityPolicy 
} from '../utils/enterpriseSecurityManager';
import { SecurityAuditLogger } from '../utils/securityAuditLogger';

interface DashboardProps {
  userRole: 'admin' | 'security_officer' | 'auditor';
  onPolicyUpdate?: (policy: Partial<SecurityPolicy>) => void;
}

const EnterpriseSecurityDashboard: React.FC<DashboardProps> = ({ 
  userRole, 
  onPolicyUpdate 
}) => {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [healthCheck, setHealthCheck] = useState<SecurityHealthCheck | null>(null);
  const [threatAssessment, setThreatAssessment] = useState<ThreatAssessment | null>(null);
  const [securityPolicy, setSecurityPolicy] = useState<SecurityPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'health' | 'threats' | 'audit' | 'policy'>('overview');
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // データ取得
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [metricsData, healthData, threatData, policyData] = await Promise.all([
        Promise.resolve(EnterpriseSecurityManager.getSecurityMetrics()),
        EnterpriseSecurityManager.performHealthCheck(),
        EnterpriseSecurityManager.performThreatAssessment(),
        Promise.resolve(EnterpriseSecurityManager.getSecurityPolicy())
      ]);

      setMetrics(metricsData);
      setHealthCheck(healthData);
      setThreatAssessment(threatData);
      setSecurityPolicy(policyData);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  // 初期データ読み込みと定期更新
  useEffect(() => {
    fetchDashboardData();
    
    // 30秒ごとに更新
    const interval = setInterval(fetchDashboardData, 30000);
    setRefreshInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // ロード中表示
  if (loading || !metrics || !healthCheck || !threatAssessment) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">セキュリティダッシュボードを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🛡️ Enterprise Security Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Role: {userRole.replace('_', ' ').toUpperCase()} | 
                Last Updated: {new Date().toLocaleString('ja-JP')}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <SecurityStatusIndicator status={healthCheck.status} />
              <button
                onClick={fetchDashboardData}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                🔄 更新
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* タブナビゲーション */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: '📊 概要', roles: ['admin', 'security_officer', 'auditor'] },
              { id: 'health', label: '💚 ヘルスチェック', roles: ['admin', 'security_officer'] },
              { id: 'threats', label: '⚠️ 脅威評価', roles: ['admin', 'security_officer'] },
              { id: 'audit', label: '📋 監査ログ', roles: ['admin', 'security_officer', 'auditor'] },
              { id: 'policy', label: '⚙️ ポリシー', roles: ['admin'] }
            ].filter(tab => tab.roles.includes(userRole)).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <OverviewTab metrics={metrics} healthCheck={healthCheck} threatAssessment={threatAssessment} />
        )}
        {activeTab === 'health' && (
          <HealthCheckTab healthCheck={healthCheck} />
        )}
        {activeTab === 'threats' && (
          <ThreatAssessmentTab threatAssessment={threatAssessment} />
        )}
        {activeTab === 'audit' && (
          <AuditLogTab />
        )}
        {activeTab === 'policy' && securityPolicy && (
          <PolicyManagementTab 
            policy={securityPolicy} 
            onPolicyUpdate={onPolicyUpdate}
          />
        )}
      </main>
    </div>
  );
};

// セキュリティ状態インジケーター
const SecurityStatusIndicator: React.FC<{ status: SecurityHealthCheck['status'] }> = ({ status }) => {
  const statusConfig = {
    healthy: { color: 'bg-green-500', text: '正常', icon: '✅' },
    warning: { color: 'bg-yellow-500', text: '警告', icon: '⚠️' },
    critical: { color: 'bg-red-500', text: '危険', icon: '🚨' }
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-3 h-3 rounded-full ${config.color}`}></div>
      <span className="text-sm font-medium text-gray-700">
        {config.icon} {config.text}
      </span>
    </div>
  );
};

// 概要タブ
const OverviewTab: React.FC<{
  metrics: SecurityMetrics;
  healthCheck: SecurityHealthCheck;
  threatAssessment: ThreatAssessment;
}> = ({ metrics, healthCheck, threatAssessment }) => {
  return (
    <div className="space-y-6">
      {/* KPIカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="総ログイン数"
          value={metrics.authentication.totalLogins}
          icon="👥"
          trend={+5.2}
        />
        <MetricCard
          title="失敗ログイン"
          value={metrics.authentication.failedLogins}
          icon="❌"
          trend={-2.1}
          isNegativeBetter
        />
        <MetricCard
          title="高リスクイベント"
          value={metrics.security.highRiskEvents}
          icon="🚨"
          trend={-10.5}
          isNegativeBetter
        />
        <MetricCard
          title="暗号化率"
          value={`${metrics.security.encryptedDataPercentage}%`}
          icon="🔒"
          trend={+1.8}
        />
      </div>

      {/* チャートエリア */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📈 セキュリティトレンド
          </h3>
          <div className="h-64 flex items-center justify-center text-gray-400">
            [チャートプレースホルダー]
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            🎯 脅威分布
          </h3>
          <div className="space-y-3">
            {threatAssessment.threats.slice(0, 5).map((threat, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{threat.type}</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  threat.severity === 'critical' ? 'bg-red-100 text-red-800' :
                  threat.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                  threat.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {threat.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 重要アラート */}
      {healthCheck.status !== 'healthy' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-red-400 text-xl">🚨</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                セキュリティアラート
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc pl-5 space-y-1">
                  {healthCheck.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// メトリックカード
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  icon: string;
  trend?: number;
  isNegativeBetter?: boolean;
}> = ({ title, value, icon, trend, isNegativeBetter = false }) => {
  const trendColor = trend 
    ? (isNegativeBetter ? trend < 0 : trend > 0) 
      ? 'text-green-600' 
      : 'text-red-600'
    : 'text-gray-400';

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
      {trend && (
        <div className="mt-2">
          <span className={`text-sm font-medium ${trendColor}`}>
            {trend > 0 ? '↗️' : '↘️'} {Math.abs(trend).toFixed(1)}%
          </span>
          <span className="text-xs text-gray-500 ml-1">vs 先月</span>
        </div>
      )}
    </div>
  );
};

// ヘルスチェックタブ
const HealthCheckTab: React.FC<{ healthCheck: SecurityHealthCheck }> = ({ healthCheck }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            💚 システムヘルスチェック
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {healthCheck.checks.map((check, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    check.status ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <div>
                    <p className="font-medium text-gray-900">{check.name}</p>
                    <p className="text-sm text-gray-600">{check.message}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  check.severity === 'critical' ? 'bg-red-100 text-red-800' :
                  check.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                  check.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {check.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {healthCheck.recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              💡 推奨事項
            </h3>
          </div>
          <div className="p-6">
            <ul className="space-y-2">
              {healthCheck.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-yellow-500 mt-0.5">⚠️</span>
                  <span className="text-sm text-gray-700">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

// 脅威評価タブ
const ThreatAssessmentTab: React.FC<{ threatAssessment: ThreatAssessment }> = ({ threatAssessment }) => {
  return (
    <div className="space-y-6">
      {/* リスクレベル表示 */}
      <div className={`rounded-lg p-6 ${
        threatAssessment.riskLevel === 'critical' ? 'bg-red-50 border border-red-200' :
        threatAssessment.riskLevel === 'high' ? 'bg-orange-50 border border-orange-200' :
        threatAssessment.riskLevel === 'medium' ? 'bg-yellow-50 border border-yellow-200' :
        'bg-green-50 border border-green-200'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              現在のリスクレベル
            </h3>
            <p className="text-sm text-gray-600">
              最終評価: {new Date(threatAssessment.lastAssessment).toLocaleString('ja-JP')}
            </p>
          </div>
          <div className={`px-4 py-2 rounded-lg text-lg font-bold ${
            threatAssessment.riskLevel === 'critical' ? 'bg-red-500 text-white' :
            threatAssessment.riskLevel === 'high' ? 'bg-orange-500 text-white' :
            threatAssessment.riskLevel === 'medium' ? 'bg-yellow-500 text-white' :
            'bg-green-500 text-white'
          }`}>
            {threatAssessment.riskLevel.toUpperCase()}
          </div>
        </div>
      </div>

      {/* 脅威一覧 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            🎯 検出された脅威
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {threatAssessment.threats.map((threat, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{threat.type}</h4>
                    <p className="text-sm text-gray-600 mt-1">{threat.description}</p>
                    <p className="text-sm text-blue-600 mt-2">
                      <strong>対策:</strong> {threat.mitigation}
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      threat.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      threat.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      threat.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {threat.severity}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{threat.timeline}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 脆弱性一覧 */}
      {threatAssessment.vulnerabilities.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              🔍 検出された脆弱性
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {threatAssessment.vulnerabilities.map((vuln, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{vuln.component}</h4>
                      {vuln.cve && (
                        <p className="text-xs text-red-600 font-mono">{vuln.cve}</p>
                      )}
                      <p className="text-sm text-gray-600 mt-1">{vuln.description}</p>
                      <p className="text-sm text-green-600 mt-2">
                        <strong>修復方法:</strong> {vuln.remediation}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      vuln.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      vuln.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      vuln.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {vuln.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 監査ログタブ
const AuditLogTab: React.FC = () => {
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 監査ログの取得
    const loadAuditEvents = async () => {
      try {
        const events = SecurityAuditLogger.querySecurityEvents({
          limit: 50,
          startTime: Date.now() - (24 * 60 * 60 * 1000) // 過去24時間
        });
        setAuditEvents(events);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    loadAuditEvents();
  }, []);

  if (loading) {
    return <div className="text-center py-8">監査ログを読み込み中...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          📋 セキュリティ監査ログ
        </h3>
        <p className="text-sm text-gray-600">過去24時間のセキュリティイベント</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                時刻
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                タイプ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                アクション
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                結果
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                リスク
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                アクター
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {auditEvents.map((event) => (
              <tr key={event.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(event.timestamp).toLocaleString('ja-JP')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {event.type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {event.action}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    event.outcome === 'success' ? 'bg-green-100 text-green-800' :
                    event.outcome === 'failure' ? 'bg-red-100 text-red-800' :
                    event.outcome === 'denied' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {event.outcome}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 h-2.5 w-2.5 rounded-full ${
                      event.riskScore >= 80 ? 'bg-red-400' :
                      event.riskScore >= 60 ? 'bg-orange-400' :
                      event.riskScore >= 40 ? 'bg-yellow-400' :
                      'bg-green-400'
                    }`}></div>
                    <span className="ml-2 text-sm text-gray-900">{event.riskScore}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {event.actor.userId || event.actor.ipAddress}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ポリシー管理タブ
const PolicyManagementTab: React.FC<{
  policy: SecurityPolicy;
  onPolicyUpdate?: (policy: Partial<SecurityPolicy>) => void;
}> = ({ policy, onPolicyUpdate }) => {
  const [editingPolicy, setEditingPolicy] = useState<SecurityPolicy>({ ...policy });
  const [hasChanges, setHasChanges] = useState(false);

  const handlePolicyChange = (section: keyof SecurityPolicy, key: string, value: any) => {
    setEditingPolicy(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      if (onPolicyUpdate) {
        await onPolicyUpdate(editingPolicy);
        setHasChanges(false);
        alert('セキュリティポリシーが更新されました');
      }
    } catch (error) {
      alert('ポリシーの更新に失敗しました');
    }
  };

  return (
    <div className="space-y-6">
      {hasChanges && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-blue-800">
              ポリシーに未保存の変更があります
            </p>
            <div className="space-x-2">
              <button
                onClick={() => {
                  setEditingPolicy({ ...policy });
                  setHasChanges(false);
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                リセット
              </button>
              <button
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 認証ポリシー */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            🔐 認証ポリシー
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              多要素認証を必須にする
            </label>
            <input
              type="checkbox"
              checked={editingPolicy.authentication.mfaRequired}
              onChange={(e) => handlePolicyChange('authentication', 'mfaRequired', e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                パスワード最低文字数
              </label>
              <input
                type="number"
                value={editingPolicy.authentication.passwordPolicy.minLength}
                onChange={(e) => handlePolicyChange('authentication', 'passwordPolicy', {
                  ...editingPolicy.authentication.passwordPolicy,
                  minLength: parseInt(e.target.value)
                })}
                className="block w-full border-gray-300 rounded-md shadow-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                最大ログイン試行回数
              </label>
              <input
                type="number"
                value={editingPolicy.authentication.lockoutPolicy.maxAttempts}
                onChange={(e) => handlePolicyChange('authentication', 'lockoutPolicy', {
                  ...editingPolicy.authentication.lockoutPolicy,
                  maxAttempts: parseInt(e.target.value)
                })}
                className="block w-full border-gray-300 rounded-md shadow-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* データ保護ポリシー */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            🔒 データ保護ポリシー
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              保存時暗号化を有効にする
            </label>
            <input
              type="checkbox"
              checked={editingPolicy.dataProtection.encryptionAtRest}
              onChange={(e) => handlePolicyChange('dataProtection', 'encryptionAtRest', e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              フィールドレベル暗号化を有効にする
            </label>
            <input
              type="checkbox"
              checked={editingPolicy.dataProtection.fieldLevelEncryption}
              onChange={(e) => handlePolicyChange('dataProtection', 'fieldLevelEncryption', e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              キーローテーション間隔（日）
            </label>
            <input
              type="number"
              value={editingPolicy.dataProtection.keyRotationInterval}
              onChange={(e) => handlePolicyChange('dataProtection', 'keyRotationInterval', parseInt(e.target.value))}
              className="block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* コンプライアンスポリシー */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            📋 コンプライアンスポリシー
          </h3>
        </div>
        <div className="p-6 space-y-4">
          {Object.entries(editingPolicy.compliance).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                {key.replace(/([A-Z])/g, ' $1').toUpperCase()}
              </label>
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => handlePolicyChange('compliance', key, e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EnterpriseSecurityDashboard;