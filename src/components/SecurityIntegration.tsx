import React, { useState, useEffect } from 'react';
import { SecureConfigManager, secureLog } from '../config/clientSecurity';

interface SecurityIntegrationProps {
  onClose: () => void;
}

interface SecurityAPI {
  id: string;
  name: string;
  type: 'VULNERABILITY_SCANNER' | 'THREAT_INTELLIGENCE' | 'COMPLIANCE' | 'MONITORING';
  endpoint: string;
  apiKey: string;
  enabled: boolean;
  lastSync?: Date;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  features: string[];
}

interface SecurityEvent {
  id: string;
  timestamp: Date;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  type: 'AUTHENTICATION' | 'AUTHORIZATION' | 'DATA_ACCESS' | 'CONFIGURATION' | 'NETWORK';
  source: string;
  message: string;
  details: any;
  resolved: boolean;
}

interface ThreatIntelligence {
  id: string;
  type: 'IP_REPUTATION' | 'DOMAIN_REPUTATION' | 'FILE_HASH' | 'CVE';
  indicator: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  source: string;
  confidence: number;
  lastUpdated: Date;
}

const SecurityIntegration: React.FC<SecurityIntegrationProps> = ({ onClose }) => {
  const [securityAPIs, setSecurityAPIs] = useState<SecurityAPI[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [threatIntel, setThreatIntel] = useState<ThreatIntelligence[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [selectedTab, setSelectedTab] = useState<'apis' | 'monitoring' | 'threats' | 'compliance'>('apis');
  const [realTimeMonitoring, setRealTimeMonitoring] = useState(false);

  // サポートされるセキュリティAPI
  const availableAPIs: Omit<SecurityAPI, 'id' | 'apiKey' | 'enabled' | 'status'>[] = [
    {
      name: 'Snyk (脆弱性スキャン)',
      type: 'VULNERABILITY_SCANNER',
      endpoint: 'https://api.snyk.io/v1',
      features: ['依存関係スキャン', 'コンテナスキャン', 'IaCスキャン', 'コードスキャン']
    },
    {
      name: 'VirusTotal (脅威インテリジェンス)',
      type: 'THREAT_INTELLIGENCE',
      endpoint: 'https://www.virustotal.com/vtapi/v2',
      features: ['IP評価', 'ドメイン評価', 'ファイルハッシュ検査', 'URL評価']
    },
    {
      name: 'NIST NVD (脆弱性データベース)',
      type: 'VULNERABILITY_SCANNER',
      endpoint: 'https://services.nvd.nist.gov/rest/json',
      features: ['CVE情報', 'CVSS評価', '脆弱性詳細', 'パッチ情報']
    },
    {
      name: 'OWASP ZAP API',
      type: 'VULNERABILITY_SCANNER',
              endpoint: '/api/security/zap',
      features: ['動的スキャン', 'パッシブスキャン', 'スパイダー', 'ファジング']
    },
    {
      name: 'Shodan (インターネット検索)',
      type: 'THREAT_INTELLIGENCE',
      endpoint: 'https://api.shodan.io',
      features: ['デバイス検索', 'ポートスキャン', 'サービス発見', 'CVE検索']
    }
  ];

  useEffect(() => {
    loadSecurityAPIs();
    loadSecurityEvents();
    loadThreatIntelligence();
    
    if (realTimeMonitoring) {
      const cleanup = startRealTimeMonitoring();
      return cleanup;
    }
  }, [realTimeMonitoring]);

  const loadSecurityAPIs = async () => {
    try {
      const mockAPIs: SecurityAPI[] = [
        {
          id: 'snyk-001',
          name: 'Snyk (脆弱性スキャン)',
          type: 'VULNERABILITY_SCANNER',
          endpoint: 'https://api.snyk.io/v1',
          apiKey: '***masked***',
          enabled: true,
          lastSync: new Date('2024-06-26T02:00:00'),
          status: 'CONNECTED',
          features: ['依存関係スキャン', 'コンテナスキャン', 'IaCスキャン']
        },
        {
          id: 'virustotal-001',
          name: 'VirusTotal',
          type: 'THREAT_INTELLIGENCE',
          endpoint: 'https://www.virustotal.com/vtapi/v2',
          apiKey: '***masked***',
          enabled: false,
          status: 'DISCONNECTED',
          features: ['IP評価', 'ドメイン評価', 'ファイルハッシュ検査']
        }
      ];
      
      setSecurityAPIs(mockAPIs);
      secureLog('セキュリティAPI設定を読み込み完了');
    } catch (error) {
      secureLog('API設定読み込みエラー:', error);
    }
  };

  const loadSecurityEvents = async () => {
    try {
      const mockEvents: SecurityEvent[] = [
        {
          id: 'event-001',
          timestamp: new Date(),
          severity: 'HIGH',
          type: 'AUTHENTICATION',
          source: 'Admin Login',
          message: '複数回の認証失敗を検出',
          details: { ip: '192.168.1.100', attempts: 5 },
          resolved: false
        },
        {
          id: 'event-002',
          timestamp: new Date(Date.now() - 3600000),
          severity: 'MEDIUM',
          type: 'DATA_ACCESS',
          source: 'Database Query',
          message: '異常なデータアクセスパターンを検出',
          details: { query_count: 1000, duration: '5min' },
          resolved: true
        },
        {
          id: 'event-003',
          timestamp: new Date(Date.now() - 7200000),
          severity: 'CRITICAL',
          type: 'NETWORK',
          source: 'WAF',
          message: 'SQLインジェクション攻撃を検出',
          details: { payload: "'; DROP TABLE users; --", blocked: true },
          resolved: true
        }
      ];
      
      setSecurityEvents(mockEvents);
    } catch (error) {
      secureLog('セキュリティイベント読み込みエラー:', error);
    }
  };

  const loadThreatIntelligence = async () => {
    try {
      const mockThreatIntel: ThreatIntelligence[] = [
        {
          id: 'threat-001',
          type: 'IP_REPUTATION',
          indicator: '192.168.1.100',
          severity: 'HIGH',
          description: '複数のマルウェア配布活動に関与',
          source: 'VirusTotal',
          confidence: 85,
          lastUpdated: new Date()
        },
        {
          id: 'threat-002',
          type: 'CVE',
          indicator: 'CVE-2024-1234',
          severity: 'CRITICAL',
          description: 'Reactライブラリの重大な脆弱性',
          source: 'NIST NVD',
          confidence: 95,
          lastUpdated: new Date()
        }
      ];
      
      setThreatIntel(mockThreatIntel);
    } catch (error) {
      secureLog('脅威インテリジェンス読み込みエラー:', error);
    }
  };

  const connectAPI = async (apiConfig: Partial<SecurityAPI>) => {
    try {
      setLoading(true);
      setStatus('🔌 APIに接続中...');

      const response = await fetch('/api/security/connect-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiConfig),
      });

      if (!response.ok) {
        throw new Error('API接続に失敗しました');
      }

      const newAPI: SecurityAPI = {
        ...apiConfig as SecurityAPI,
        id: `api-${Date.now()}`,
        status: 'CONNECTED',
        enabled: true,
        lastSync: new Date()
      };

      setSecurityAPIs(prev => [...prev, newAPI]);
      setStatus('✅ API接続が完了しました');
      
      secureLog('セキュリティAPI接続完了', { apiName: apiConfig.name });
    } catch (error) {
      setStatus('❌ API接続に失敗しました');
      secureLog('API接続エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const startRealTimeMonitoring = () => {
    secureLog('リアルタイムセキュリティ監視を開始');
    
    const monitoringInterval = setInterval(() => {
      checkForNewSecurityEvents();
    }, 30000);

    return () => clearInterval(monitoringInterval);
  };

  const checkForNewSecurityEvents = async () => {
    try {
      const response = await fetch('/api/security/events/latest');
      if (response.ok) {
        const newEvents = await response.json();
        if (newEvents.length > 0) {
          setSecurityEvents(prev => [...newEvents, ...prev]);
          
          const criticalEvents = newEvents.filter((e: SecurityEvent) => 
            e.severity === 'CRITICAL' || e.severity === 'HIGH'
          );
          
          if (criticalEvents.length > 0) {
            showSecurityAlert(criticalEvents);
          }
        }
      }
    } catch (error) {
      secureLog('セキュリティイベントチェックエラー:', error);
    }
  };

  const showSecurityAlert = (events: SecurityEvent[]) => {
    const message = `🚨 ${events.length}件の重要なセキュリティイベントが検出されました`;
    setStatus(message);
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('セキュリティアラート', {
        body: message,
        icon: '/security-icon.png'
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'LOW': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONNECTED': return 'text-green-600 bg-green-100';
      case 'DISCONNECTED': return 'text-gray-600 bg-gray-100';
      case 'ERROR': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">🔗 セキュリティAPI統合</h2>
              <p className="text-purple-100">外部セキュリティサービスとの連携とリアルタイム監視</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'apis', label: '🔌 API連携' },
              { id: 'monitoring', label: '📊 リアルタイム監視' },
              { id: 'threats', label: '🛡️ 脅威インテリジェンス' },
              { id: 'compliance', label: '📋 コンプライアンス' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6 overflow-y-auto h-full">
          {status && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800">{status}</p>
            </div>
          )}

          {selectedTab === 'apis' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">利用可能なセキュリティAPI</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableAPIs.map((api, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">{api.name}</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      {api.type.replace('_', ' ')}
                    </p>
                    
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">機能:</p>
                      <div className="flex flex-wrap gap-1">
                        {api.features.slice(0, 2).map((feature, fidx) => (
                          <span key={fidx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {feature}
                          </span>
                        ))}
                        {api.features.length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{api.features.length - 2}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => connectAPI(api)}
                      disabled={loading}
                      className="w-full bg-purple-600 text-white px-3 py-2 text-sm rounded hover:bg-purple-700 disabled:opacity-50"
                    >
                      🔌 接続設定
                    </button>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">📋 API連携の注意事項</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 本番環境では各サービスのAPIキーが必要です</li>
                  <li>• 一部のAPIは有料プランが必要な場合があります</li>
                  <li>• MCP (Model Context Protocol) 対応のAPIは自動連携が可能です</li>
                  <li>• セキュリティスキャンの頻度は組織のポリシーに従って設定してください</li>
                </ul>
              </div>
            </div>
          )}

          {selectedTab === 'monitoring' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">リアルタイムセキュリティ監視</h3>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={realTimeMonitoring}
                      onChange={(e) => setRealTimeMonitoring(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">リアルタイム監視</span>
                  </label>
                  <div className={`w-3 h-3 rounded-full ${realTimeMonitoring ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                </div>
              </div>

              <div className="space-y-3">
                {securityEvents.slice(0, 5).map((event) => (
                  <div key={event.id} className={`border rounded-lg p-4 ${event.resolved ? 'bg-gray-50' : 'bg-white'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(event.severity)}`}>
                          {event.severity}
                        </span>
                        <span className="text-sm text-gray-600">{event.type}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {event.timestamp.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900">{event.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedTab === 'threats' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">脅威インテリジェンス</h3>
              <div className="space-y-3">
                {threatIntel.map((threat) => (
                  <div key={threat.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(threat.severity)}`}>
                          {threat.severity}
                        </span>
                        <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{threat.indicator}</span>
                      </div>
                      <span className="text-xs text-gray-500">信頼度: {threat.confidence}%</span>
                    </div>
                    <p className="text-sm text-gray-900">{threat.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedTab === 'compliance' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">コンプライアンスチェック</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'GDPR', description: 'EU一般データ保護規則', status: 'COMPLIANT' },
                  { name: 'PCI-DSS', description: 'Payment Card Industry Data Security Standard', status: 'PARTIAL' },
                  { name: '個人情報保護法', description: '日本の個人情報保護法', status: 'COMPLIANT' }
                ].map((compliance, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{compliance.name}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        compliance.status === 'COMPLIANT' ? 'bg-green-100 text-green-800' :
                        compliance.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {compliance.status === 'COMPLIANT' ? '準拠' : 
                         compliance.status === 'PARTIAL' ? '部分準拠' : '非準拠'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{compliance.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecurityIntegration; 