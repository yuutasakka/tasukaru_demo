import React, { useState, useEffect } from 'react';
import { SecureConfigManager, secureLog } from '../config/clientSecurity';

interface SecurityAuditReportProps {
  onClose: () => void;
}

interface AuditReport {
  id: string;
  title: string;
  generatedAt: Date;
  reportType: 'COMPREHENSIVE' | 'COMPLIANCE' | 'VULNERABILITY' | 'INCIDENT';
  status: 'DRAFT' | 'COMPLETED' | 'REVIEWED' | 'APPROVED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  findings: AuditFinding[];
  recommendations: Recommendation[];
  executiveSummary: string;
  technicalDetails: string;
}

interface AuditFinding {
  id: string;
  category: 'AUTHENTICATION' | 'AUTHORIZATION' | 'DATA_PROTECTION' | 'NETWORK' | 'APPLICATION' | 'INFRASTRUCTURE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  evidence: string[];
  affectedSystems: string[];
  riskScore: number;
  remediationCost: 'LOW' | 'MEDIUM' | 'HIGH';
  timeline: string;
}

interface Recommendation {
  id: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  implementation: string;
  estimatedCost: string;
  timeline: string;
  responsible: string;
  complianceFramework?: string[];
}

interface ComplianceMapping {
  framework: string;
  requirements: {
    id: string;
    title: string;
    status: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | 'NOT_APPLICABLE';
    evidence: string[];
    gaps: string[];
  }[];
}

const SecurityAuditReport: React.FC<SecurityAuditReportProps> = ({ onClose }) => {
  const [reports, setReports] = useState<AuditReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [selectedTab, setSelectedTab] = useState<'reports' | 'generate' | 'compliance' | 'export'>('reports');
  const [newReportType, setNewReportType] = useState<'COMPREHENSIVE' | 'COMPLIANCE' | 'VULNERABILITY' | 'INCIDENT'>('COMPREHENSIVE');

  // コンプライアンスフレームワーク
  const complianceFrameworks = [
    { id: 'GDPR', name: 'GDPR (EU一般データ保護規則)', requirements: 25 },
    { id: 'PCI_DSS', name: 'PCI-DSS (Payment Card Industry)', requirements: 12 },
    { id: 'SOX', name: 'SOX法 (Sarbanes-Oxley Act)', requirements: 8 },
    { id: 'ISO_27001', name: 'ISO 27001 (情報セキュリティ管理)', requirements: 35 },
    { id: 'NIST', name: 'NIST サイバーセキュリティフレームワーク', requirements: 23 },
    { id: 'PERSONAL_INFO_PROTECTION', name: '日本の個人情報保護法', requirements: 15 }
  ];

  useEffect(() => {
    loadAuditReports();
  }, []);

  const loadAuditReports = async () => {
    try {
      setLoading(true);
      
      // モック監査レポートデータ
      const mockReports: AuditReport[] = [
        {
          id: 'audit-001',
          title: '2024年Q2 包括的セキュリティ監査',
          generatedAt: new Date('2024-06-26'),
          reportType: 'COMPREHENSIVE',
          status: 'COMPLETED',
          severity: 'HIGH',
          executiveSummary: 'タスカルアプリケーションの包括的なセキュリティ評価を実施しました。全体的なセキュリティ態勢は良好ですが、いくつかの重要な改善点が特定されました。',
          technicalDetails: '詳細な技術評価により、認証システム、データ暗号化、API セキュリティなどの領域で強化が必要であることが判明しました。',
          findings: [
            {
              id: 'finding-001',
              category: 'AUTHENTICATION',
              severity: 'HIGH',
              title: '2要素認証の未実装',
              description: '管理者アカウントに2要素認証が設定されていません',
              evidence: ['ログイン画面のスクリーンショット', 'セキュリティ設定確認'],
              affectedSystems: ['Admin Dashboard', 'User Management'],
              riskScore: 8.5,
              remediationCost: 'MEDIUM',
              timeline: '2週間'
            },
            {
              id: 'finding-002',
              category: 'DATA_PROTECTION',
              severity: 'MEDIUM',
              title: 'データベース暗号化の部分実装',
              description: '機密データの一部が暗号化されていません',
              evidence: ['データベーススキーマ分析', '暗号化ポリシー確認'],
              affectedSystems: ['Database', 'Data Storage'],
              riskScore: 6.2,
              remediationCost: 'HIGH',
              timeline: '4週間'
            }
          ],
          recommendations: [
            {
              id: 'rec-001',
              priority: 'HIGH',
              title: '2要素認証の即座実装',
              description: 'Google Authenticator互換のTOTPベース2要素認証システムの導入',
              implementation: '既存の認証フローにTOTP検証ステップを追加',
              estimatedCost: '30-40万円',
              timeline: '2週間',
              responsible: '開発チーム',
              complianceFramework: ['NIST', 'ISO_27001']
            },
            {
              id: 'rec-002',
              priority: 'MEDIUM',
              title: 'データベース暗号化の完全化',
              description: '全ての機密データフィールドでの暗号化実装',
              implementation: 'AES-256-GCM暗号化の適用とキー管理システムの構築',
              estimatedCost: '80-120万円',
              timeline: '4週間',
              responsible: 'インフラチーム',
              complianceFramework: ['GDPR', 'PCI_DSS']
            }
          ]
        },
        {
          id: 'audit-002',
          title: 'GDPR コンプライアンス評価',
          generatedAt: new Date('2024-06-20'),
          reportType: 'COMPLIANCE',
          status: 'REVIEWED',
          severity: 'MEDIUM',
          executiveSummary: 'GDPR要件に対する現在のコンプライアンス状況を評価しました。',
          technicalDetails: 'データ処理活動、プライバシーポリシー、同意管理などの観点から評価を実施しました。',
          findings: [],
          recommendations: []
        }
      ];

      setReports(mockReports);
      secureLog('監査レポート一覧を読み込み完了');
    } catch (error) {
      secureLog('監査レポート読み込みエラー:', error);
      setStatus('❌ レポートの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const generateAuditReport = async () => {
    try {
      setLoading(true);
      setStatus('📋 監査レポートを生成中...');

      const response = await fetch('/api/security/audit/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType: 'COMPREHENSIVE',
          includeVulnerabilities: true,
          includeCompliance: true
        }),
      });

      if (!response.ok) {
        throw new Error('監査レポート生成に失敗しました');
      }

      const auditReport = await response.json();
      setReports([auditReport]);
      setStatus('✅ 監査レポートが生成されました');
      
      secureLog('監査レポート生成完了', { reportType: newReportType });
    } catch (error) {
      setStatus('❌ レポート生成に失敗しました');
      secureLog('監査レポート生成エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = (report: AuditReport, format: 'PDF' | 'DOCX' | 'JSON') => {
    try {
      setStatus(`📄 ${format}形式でレポートをエクスポート中...`);

      const reportData = {
        ...report,
        exportedAt: new Date(),
        format: format
      };

      // エクスポート処理（実際はサーバーサイドで処理）
      const dataStr = JSON.stringify(reportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `security-audit-report-${report.id}.${format.toLowerCase()}`;
      link.click();
      
      URL.revokeObjectURL(url);
      
      setStatus(`✅ ${format}レポートをダウンロードしました`);
      secureLog('監査レポートエクスポート完了', { reportId: report.id, format });
    } catch (error) {
      setStatus('❌ レポートエクスポートに失敗しました');
      secureLog('レポートエクスポートエラー:', error);
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
      case 'APPROVED': return 'text-green-600 bg-green-100';
      case 'REVIEWED': return 'text-blue-600 bg-blue-100';
      case 'COMPLETED': return 'text-purple-600 bg-purple-100';
      case 'DRAFT': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-5/6 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">📋 セキュリティ監査レポート</h2>
              <p className="text-blue-100">包括的なセキュリティ評価とコンプライアンス報告</p>
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
              { id: 'reports', label: '📊 レポート一覧' },
              { id: 'generate', label: '🔄 レポート生成' },
              { id: 'compliance', label: '📋 コンプライアンス' },
              { id: 'export', label: '📤 エクスポート' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === tab.id
                    ? 'border-blue-500 text-blue-600'
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

          {selectedTab === 'reports' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">監査レポート一覧</h3>
                <button
                  onClick={generateAuditReport}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  📋 新規レポート生成
                </button>
              </div>

              <div className="space-y-4">
                {reports.map((report) => (
                  <div 
                    key={report.id} 
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedReport(selectedReport?.id === report.id ? null : report)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-xl font-semibold text-gray-900 mb-2">{report.title}</h4>
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(report.severity)}`}>
                            {report.severity}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(report.status)}`}>
                            {report.status}
                          </span>
                          <span className="text-sm text-gray-600">{report.reportType}</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          生成日: {report.generatedAt.toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            exportReport(report, 'PDF');
                          }}
                          className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                        >
                          PDF
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            exportReport(report, 'DOCX');
                          }}
                          className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                        >
                          DOCX
                        </button>
                      </div>
                    </div>

                    <p className="text-gray-700 mb-4">{report.executiveSummary}</p>

                    {selectedReport?.id === report.id && (
                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* 発見事項 */}
                          <div>
                            <h5 className="font-medium text-gray-900 mb-3">🔍 主要な発見事項</h5>
                            <div className="space-y-3">
                              {report.findings.map((finding) => (
                                <div key={finding.id} className="bg-gray-50 p-4 rounded-lg">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(finding.severity)}`}>
                                      {finding.severity}
                                    </span>
                                    <span className="text-sm font-medium text-gray-900">{finding.title}</span>
                                  </div>
                                  <p className="text-sm text-gray-700 mb-2">{finding.description}</p>
                                  <div className="flex justify-between text-xs text-gray-500">
                                    <span>リスクスコア: {finding.riskScore}/10</span>
                                    <span>修復期間: {finding.timeline}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 推奨事項 */}
                          <div>
                            <h5 className="font-medium text-gray-900 mb-3">💡 推奨事項</h5>
                            <div className="space-y-3">
                              {report.recommendations.map((rec) => (
                                <div key={rec.id} className="bg-blue-50 p-4 rounded-lg">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                      rec.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                                      rec.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                                      rec.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-blue-100 text-blue-800'
                                    }`}>
                                      {rec.priority}
                                    </span>
                                    <span className="text-sm font-medium text-gray-900">{rec.title}</span>
                                  </div>
                                  <p className="text-sm text-gray-700 mb-2">{rec.description}</p>
                                  <div className="flex justify-between text-xs text-gray-500">
                                    <span>予算: {rec.estimatedCost}</span>
                                    <span>担当: {rec.responsible}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedTab === 'generate' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">新規監査レポート生成</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    レポートタイプ
                  </label>
                  <select
                    value={newReportType}
                    onChange={(e) => setNewReportType(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="COMPREHENSIVE">包括的監査</option>
                    <option value="COMPLIANCE">コンプライアンス評価</option>
                    <option value="VULNERABILITY">脆弱性評価</option>
                    <option value="INCIDENT">インシデント調査</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    含める要素
                  </label>
                  <div className="space-y-2">
                    {['セキュリティスキャン結果', 'ペネトレーションテスト', 'コンプライアンスチェック', 'インシデント履歴'].map((item) => (
                      <label key={item} className="flex items-center">
                        <input type="checkbox" defaultChecked className="mr-2" />
                        <span className="text-sm text-gray-700">{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={generateAuditReport}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                📋 レポート生成開始
              </button>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">📝 レポート生成について</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 包括的監査: 全セキュリティ領域の評価（生成時間: 15-20分）</li>
                  <li>• コンプライアンス評価: 法規制・標準への準拠状況（生成時間: 10-15分）</li>
                  <li>• 脆弱性評価: セキュリティホールの特定と評価（生成時間: 5-10分）</li>
                  <li>• インシデント調査: 特定事象の詳細分析（生成時間: 20-30分）</li>
                </ul>
              </div>
            </div>
          )}

          {selectedTab === 'compliance' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">コンプライアンス評価</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {complianceFrameworks.map((framework) => (
                  <div key={framework.id} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">{framework.name}</h4>
                    <div className="mb-3">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>要件数</span>
                        <span>{framework.requirements}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${Math.random() * 40 + 60}%` }}
                        ></div>
                      </div>
                    </div>
                    <button className="w-full bg-blue-600 text-white px-3 py-2 text-sm rounded hover:bg-blue-700">
                      詳細評価
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedTab === 'export' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">レポートエクスポート</h3>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">📋 エクスポート形式</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• PDF: 標準的な監査レポート形式（推奨）</li>
                  <li>• DOCX: 編集可能なWord文書形式</li>
                  <li>• JSON: システム間連携用データ形式</li>
                  <li>• CSV: 発見事項・推奨事項の表形式データ</li>
                </ul>
              </div>

              <div className="space-y-4">
                {reports.slice(0, 3).map((report) => (
                  <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium text-gray-900">{report.title}</h4>
                        <p className="text-sm text-gray-600">
                          {report.generatedAt.toLocaleDateString()} - {report.status}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => exportReport(report, 'PDF')}
                          className="bg-red-600 text-white px-3 py-1 text-sm rounded hover:bg-red-700"
                        >
                          PDF
                        </button>
                        <button
                          onClick={() => exportReport(report, 'DOCX')}
                          className="bg-blue-600 text-white px-3 py-1 text-sm rounded hover:bg-blue-700"
                        >
                          DOCX
                        </button>
                        <button
                          onClick={() => exportReport(report, 'JSON')}
                          className="bg-green-600 text-white px-3 py-1 text-sm rounded hover:bg-green-700"
                        >
                          JSON
                        </button>
                      </div>
                    </div>
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

export default SecurityAuditReport; 