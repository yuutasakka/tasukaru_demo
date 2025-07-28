import React, { useState, useEffect } from 'react';
import { registrationManager, RegistrationRequest } from './supabaseClient';

interface AdminApprovalDashboardProps {
  currentAdminId: number;
  onApprovalUpdate?: () => void;
}

// RegistrationRequest 型を使用

const AdminApprovalDashboard: React.FC<AdminApprovalDashboardProps> = ({
  currentAdminId,
  onApprovalUpdate
}) => {
  const [approvals, setApprovals] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  // 承認待ち一覧を取得
  const loadPendingApprovals = async () => {
    try {
      setLoading(true);
      setError('');
      
      // admin_registrations テーブルから pending 状態の申請を取得
      const pendingRequests = await registrationManager.getRegistrationRequests('pending');
      setApprovals(pendingRequests);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '承認待ち一覧の取得中にエラーが発生しました。';
      setError(errorMessage);
      setApprovals([]); // エラー時は空配列を設定
    } finally {
      setLoading(false);
    }
  };

  // 申請を承認
  const handleApprove = async (approvalId: string) => {
    try {
      setProcessing(approvalId);
      setError('');
      
      
      const result = await registrationManager.approveOrRejectRequest(
        approvalId,
        'approve',
        '管理者による承認',
        `admin_${currentAdminId}`
      );
      
      
      if (result.success) {
        alert(result.message || '管理者申請を承認しました。');
        await loadPendingApprovals();
        onApprovalUpdate?.();
      } else {
        const errorMessage = result.error || '承認処理に失敗しました。';
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '承認処理中にエラーが発生しました。';
      setError(errorMessage);
    } finally {
      setProcessing(null);
    }
  };

  // 申請を拒否
  const handleReject = async (approvalId: string) => {
    if (!rejectionReason.trim()) {
      setError('拒否理由を入力してください。');
      return;
    }

    try {
      setProcessing(approvalId);
      setError('');
      
      
      const result = await registrationManager.approveOrRejectRequest(
        approvalId,
        'reject',
        rejectionReason.trim(),
        `admin_${currentAdminId}`
      );
      
      
      if (result.success) {
        alert(result.message || '管理者申請を拒否しました。');
        await loadPendingApprovals();
        setShowRejectModal(null);
        setRejectionReason('');
        onApprovalUpdate?.();
      } else {
        const errorMessage = result.error || '拒否処理に失敗しました。';
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '拒否処理中にエラーが発生しました。';
      setError(errorMessage);
    } finally {
      setProcessing(null);
    }
  };

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-300 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">承認申請一覧</h2>
        <button
          onClick={loadPendingApprovals}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
        >
          更新
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        </div>
      )}

      {approvals.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">承認待ちの申請はありません</h3>
          <p className="text-gray-600">新しい管理者申請があるとここに表示されます。</p>
        </div>
      ) : (
        <div className="space-y-6">
          {approvals.map((approval) => (
            <div key={approval.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{approval.full_name || '氏名未記載'}</h3>
                      <p className="text-gray-600">{approval.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                      <p className="text-gray-900">{approval.phone_number}</p>
                    </div>
                    {approval.department && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">所属部署</label>
                        <p className="text-gray-900">{approval.department}</p>
                      </div>
                    )}
                  </div>

                  {approval.reason && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">申請理由</label>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{approval.reason}</p>
                    </div>
                  )}

                  <div className="text-sm text-gray-500">
                    申請日時: {new Date(approval.created_at).toLocaleString('ja-JP')}
                  </div>
                </div>

                <div className="flex flex-col space-y-2 ml-6">
                  <button
                    onClick={() => handleApprove(approval.id)}
                    disabled={processing === approval.id}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing === approval.id ? '処理中...' : '承認'}
                  </button>
                  <button
                    onClick={() => setShowRejectModal(approval.id)}
                    disabled={processing === approval.id}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    拒否
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 拒否理由入力モーダル */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">申請拒否理由</h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              placeholder="拒否理由を入力してください"
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
              >
                キャンセル
              </button>
              <button
                onClick={() => showRejectModal && handleReject(showRejectModal)}
                disabled={!rejectionReason.trim() || processing === showRejectModal}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing === showRejectModal ? '処理中...' : '拒否する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApprovalDashboard; 