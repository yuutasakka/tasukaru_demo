import React, { useState, useEffect } from 'react';
import { registrationManager, RegistrationRequest } from './supabaseClient';

interface PendingRequestsComponentProps {
  onStatusUpdate?: () => void;
}

const PendingRequestsComponent: React.FC<PendingRequestsComponentProps> = ({ onStatusUpdate }) => {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [currentAction, setCurrentAction] = useState<'approve' | 'reject' | null>(null);

  // 申請一覧を読み込み
  const loadRequests = async () => {
    try {
      setLoading(true);
      const pendingRequests = await registrationManager.getRegistrationRequests('pending');
      setRequests(pendingRequests);
    } catch (error) {
      setStatusMessage('申請一覧の読み込みに失敗しました');
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  // 初期読み込み
  useEffect(() => {
    loadRequests();
  }, []);

  // 承認/却下モーダルを開く
  const openActionModal = (request: RegistrationRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setCurrentAction(action);
    setAdminNotes('');
    setShowModal(true);
  };

  // モーダルを閉じる
  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
    setCurrentAction(null);
    setAdminNotes('');
  };

  // 申請を処理
  const handleProcessRequest = async () => {
    if (!selectedRequest || !currentAction) return;

    setProcessingId(selectedRequest.id.toString());
    
    try {
      const result = await registrationManager.approveOrRejectRequest(
        selectedRequest.id.toString(),
        currentAction,
        adminNotes,
        'admin'
      );

      if (result.success) {
        setStatusMessage(result.message || '処理が完了しました');
        setStatusType('success');
        
        // 申請一覧を再読み込み
        await loadRequests();
        
        // 親コンポーネントに通知
        if (onStatusUpdate) {
          onStatusUpdate();
        }
      } else {
        setStatusMessage(result.error || '処理に失敗しました');
        setStatusType('error');
      }
    } catch (error) {
      setStatusMessage('システムエラーが発生しました');
      setStatusType('error');
    } finally {
      setProcessingId(null);
      closeModal();
    }
  };

  // 日時フォーマット
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ステータスメッセージを自動で消す
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">承認待ち申請</h2>
        <button
          onClick={loadRequests}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50"
        >
          <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
          <span>更新</span>
        </button>
      </div>

      {/* ステータスメッセージ */}
      {statusMessage && (
        <div className={`p-4 rounded-lg ${
          statusType === 'success' ? 'bg-green-100 text-green-700 border border-green-200' :
          statusType === 'error' ? 'bg-red-100 text-red-700 border border-red-200' :
          'bg-blue-100 text-blue-700 border border-blue-200'
        }`}>
          <div className="flex items-center">
            <i className={`fas ${
              statusType === 'success' ? 'fa-check-circle' :
              statusType === 'error' ? 'fa-exclamation-circle' :
              'fa-info-circle'
            } mr-2`}></i>
            <span>{statusMessage}</span>
          </div>
        </div>
      )}

      {/* 申請一覧 */}
      {loading ? (
        <div className="text-center py-8">
          <i className="fas fa-spinner fa-spin text-2xl text-gray-400 mb-4"></i>
          <p className="text-gray-600">申請を読み込み中...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-8">
          <i className="fas fa-inbox text-4xl text-gray-300 mb-4"></i>
          <p className="text-gray-600">承認待ちの申請はありません</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {requests.map((request) => (
            <div key={request.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {request.full_name}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <i className="fas fa-envelope mr-2"></i>
                      {request.email}
                    </div>
                    <div>
                      <i className="fas fa-phone mr-2"></i>
                      {request.phone_number}
                    </div>
                    {request.organization && (
                      <div>
                        <i className="fas fa-building mr-2"></i>
                        {request.organization}
                      </div>
                    )}
                    <div>
                      <i className="fas fa-clock mr-2"></i>
                      {formatDate(request.created_at)}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => openActionModal(request, 'approve')}
                    disabled={processingId === request.id.toString()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i className="fas fa-check mr-1"></i>
                    承認
                  </button>
                  <button
                    onClick={() => openActionModal(request, 'reject')}
                    disabled={processingId === request.id.toString()}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i className="fas fa-times mr-1"></i>
                    却下
                  </button>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-2">利用目的:</h4>
                <p className="text-gray-700 text-sm leading-relaxed">{request.purpose}</p>
              </div>

              {processingId === request.id.toString() && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="flex items-center">
                    <i className="fas fa-spinner fa-spin text-blue-500 mr-2"></i>
                    <span className="text-blue-700 text-sm">処理中...</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 承認/却下モーダル */}
      {showModal && selectedRequest && currentAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        </div>
      )}
    </div>
  );
};

export default PendingRequestsComponent; 