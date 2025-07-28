import React, { useState, useEffect } from 'react';
import { registrationManager } from './supabaseClient';

interface FormData {
  fullName: string;
  email: string;
  phoneNumber: string;
  organization: string;
  purpose: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  purpose?: string;
}

interface RegistrationRequestPageProps {
  onNavigateHome?: () => void;
}

const RegistrationRequestPage: React.FC<RegistrationRequestPageProps> = ({ onNavigateHome }) => {
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phoneNumber: '',
    organization: '',
    purpose: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  // フォームデータの更新
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // エラーをクリア
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  // バリデーション
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // 氏名チェック
    if (!formData.fullName.trim()) {
      newErrors.fullName = '氏名は必須です';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = '氏名は2文字以上で入力してください';
    }

    // メールアドレスチェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'メールアドレスは必須です';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    }

    // 電話番号チェック
    const phoneRegex = /^[0-9\-\s\+\(\)]+$/;
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = '電話番号は必須です';
    } else if (!phoneRegex.test(formData.phoneNumber)) {
      newErrors.phoneNumber = '有効な電話番号を入力してください';
    }

    // 利用目的チェック
    if (!formData.purpose.trim()) {
      newErrors.purpose = '利用目的は必須です';
    } else if (formData.purpose.trim().length < 10) {
      newErrors.purpose = '利用目的は10文字以上で入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // メールアドレスの重複チェック
      const emailExists = await registrationManager.checkEmailExists(formData.email);
      if (emailExists) {
        setErrors({ email: 'このメールアドレスは既に申請されています' });
        setIsSubmitting(false);
        return;
      }

      // 申請を作成
      const result = await registrationManager.createRegistrationRequest({
        full_name: formData.fullName,
        email: formData.email,
        phone_number: formData.phoneNumber,
        organization: formData.organization || undefined,
        purpose: formData.purpose
      });

      if (result.success) {
        setSubmitStatus('success');
        setSubmitMessage('申請が正常に送信されました。管理者の承認をお待ちください。');
        
        // フォームをリセット
        setFormData({
          fullName: '',
          email: '',
          phoneNumber: '',
          organization: '',
          purpose: ''
        });
      } else {
        setSubmitStatus('error');
        setSubmitMessage(result.error || '申請の送信に失敗しました');
      }

    } catch (error) {
      setSubmitStatus('error');
      setSubmitMessage('システムエラーが発生しました。時間をおいて再度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              新規ユーザー申請
            </h1>
            <p className="text-gray-600">
              タスカルのご利用には管理者の承認が必要です
            </p>
          </div>

          {submitStatus === 'success' && (
            <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{submitMessage}</p>
                </div>
              </div>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{submitMessage}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 氏名 */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                氏名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.fullName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="山田太郎"
                disabled={isSubmitting}
              />
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
              )}
            </div>

            {/* メールアドレス */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="example@email.com"
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* 電話番号 */}
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                電話番号 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.phoneNumber ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="090-1234-5678"
                disabled={isSubmitting}
              />
              {errors.phoneNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>
              )}
            </div>

            {/* 組織名（任意） */}
            <div>
              <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-1">
                組織名・会社名（任意）
              </label>
              <input
                type="text"
                id="organization"
                name="organization"
                value={formData.organization}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="株式会社○○"
                disabled={isSubmitting}
              />
            </div>

            {/* 利用目的 */}
            <div>
              <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-1">
                利用目的 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="purpose"
                name="purpose"
                value={formData.purpose}
                onChange={handleInputChange}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.purpose ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="どのような目的でタスカルを利用されますか？詳しくお聞かせください。"
                disabled={isSubmitting}
              />
              {errors.purpose && (
                <p className="mt-1 text-sm text-red-600">{errors.purpose}</p>
              )}
            </div>

            {/* 送信ボタン */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    送信中...
                  </div>
                ) : (
                  '申請を送信'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              既にアカウントをお持ちの場合は{' '}
              <button
                onClick={onNavigateHome}
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                ホームに戻る
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationRequestPage; 