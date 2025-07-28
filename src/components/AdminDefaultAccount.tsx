import React from 'react';

interface AdminDefaultAccountProps {
  onClose: () => void;
}

const AdminDefaultAccount: React.FC<AdminDefaultAccountProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          🔐 デフォルト管理者アカウント
        </h3>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800 mb-3">
            以下のアカウントでログインできます：
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-white rounded p-2">
              <span className="text-sm font-medium text-gray-700">ユーザー名:</span>
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">admin</code>
            </div>
            <div className="flex items-center justify-between bg-white rounded p-2">
              <span className="text-sm font-medium text-gray-700">パスワード:</span>
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">Admin123!</code>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            ⚠️ <strong>重要:</strong> 本番環境では必ずパスワードを変更してください
          </p>
        </div>
        
        <button
          onClick={onClose}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
        >
          閉じる
        </button>
      </div>
    </div>
  );
};

export default AdminDefaultAccount;