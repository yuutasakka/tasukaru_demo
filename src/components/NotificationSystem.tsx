import React, { useState, useEffect } from 'react';
import { NotificationSettings, EmailNotificationConfig, SlackNotificationConfig, LineNotificationConfig, ChatWorkNotificationConfig } from '../../types';
import { SECURITY_CONFIG } from '../config/clientSecurity';

interface NotificationSystemProps {
  onNotificationSent: (message: string) => void;
  onError: (error: string) => void;
}

export interface DiagnosisNotification {
  type: 'new_diagnosis' | 'user_registration' | 'system_alert';
  userId: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  diagnosisData?: any;
  timestamp: string;
  message: string;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({ onNotificationSent, onError }) => {
  const [settings, setSettings] = useState<{
    enabled: boolean;
    emailNotifications: {
      enabled: boolean;
      smtpServer: string;
      smtpPort: number;
      smtpUser: string;
      smtpPassword: string;
      fromEmail: string;
      toEmails: string[];
    };
    slackNotifications: {
      enabled: boolean;
      webhookUrl: string;
      channel: string;
      username: string;
    };
    lineNotifications: {
      enabled: boolean;
      accessToken: string;
      userId: string;
    };
    chatWorkNotifications: {
      enabled: boolean;
      apiToken: string;
      roomId: string;
    };
  }>({
    enabled: false,
    emailNotifications: {
      enabled: false,
      smtpServer: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      fromEmail: '',
      toEmails: []
    },
    slackNotifications: {
      enabled: false,
      webhookUrl: '',
      channel: '#general',
      username: 'タスカル'
    },
    lineNotifications: {
      enabled: false,
      accessToken: '',
      userId: ''
    },
    chatWorkNotifications: {
      enabled: false,
      apiToken: '',
      roomId: ''
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [testMode, setTestMode] = useState(false);

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      const savedSettings = sessionStorage.getItem('notification_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      onError('通知設定の読み込みに失敗しました');
    }
  };

  const saveNotificationSettings = async () => {
    try {
      setIsLoading(true);
      sessionStorage.setItem('notification_settings', JSON.stringify(settings));
      onNotificationSent('通知設定が保存されました');
    } catch (error) {
      onError('通知設定の保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const sendNotification = async (notification: DiagnosisNotification) => {
    if (!settings.enabled) return;

    try {
      setIsLoading(true);
      const results = [];

      // Email通知
      if (settings.emailNotifications.enabled) {
        const emailResult = await sendEmailNotification(notification);
        results.push(emailResult);
      }

      // Slack通知
      if (settings.slackNotifications.enabled) {
        const slackResult = await sendSlackNotification(notification);
        results.push(slackResult);
      }

      // LINE通知
      if (settings.lineNotifications.enabled) {
        const lineResult = await sendLineNotification(notification);
        results.push(lineResult);
      }

      // ChatWork通知
      if (settings.chatWorkNotifications.enabled) {
        const chatWorkResult = await sendChatWorkNotification(notification);
        results.push(chatWorkResult);
      }

      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;

      if (successCount > 0) {
        onNotificationSent(`通知が送信されました (${successCount}/${totalCount})`);
      } else {
        onError('通知の送信に失敗しました');
      }
    } catch (error) {
      onError('通知の送信中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const sendEmailNotification = async (notification: DiagnosisNotification): Promise<{ success: boolean; message?: string }> => {
    try {
      const emailConfig = settings.emailNotifications;
      const subject = `[タスカル] ${getNotificationTitle(notification.type)}`;
      const body = formatNotificationMessage(notification);

      // 実際の実装では、バックエンドAPIまたはSMTPサービスを使用
      if (testMode) {
        return { success: true };
      }

      // バックエンドAPIを呼び出す
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: emailConfig.toEmails,
          subject,
          body,
          config: emailConfig
        })
      });

      if (!response.ok) {
        throw new Error(`Email送信失敗: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const sendSlackNotification = async (notification: DiagnosisNotification): Promise<{ success: boolean; message?: string }> => {
    try {
      const slackConfig = settings.slackNotifications;
      const message = formatSlackMessage(notification);

      if (testMode) {
        return { success: true };
      }

      const response = await fetch(slackConfig.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: slackConfig.channel,
          username: slackConfig.username,
          text: message,
          icon_emoji: ':money_with_wings:'
        })
      });

      if (!response.ok) {
        throw new Error(`Slack送信失敗: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const sendLineNotification = async (notification: DiagnosisNotification): Promise<{ success: boolean; message?: string }> => {
    try {
      const lineConfig = settings.lineNotifications;
      const message = formatNotificationMessage(notification);

      if (testMode) {
        return { success: true };
      }

      const response = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lineConfig.accessToken}`
        },
        body: JSON.stringify({
          to: lineConfig.userId,
          messages: [
            {
              type: 'text',
              text: message
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`LINE送信失敗: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const sendChatWorkNotification = async (notification: DiagnosisNotification): Promise<{ success: boolean; message?: string }> => {
    try {
      const chatWorkConfig = settings.chatWorkNotifications;
      const message = formatNotificationMessage(notification);

      if (testMode) {
        return { success: true };
      }

      const response = await fetch(`https://api.chatwork.com/v2/rooms/${chatWorkConfig.roomId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-ChatWorkToken': chatWorkConfig.apiToken
        },
        body: `body=${encodeURIComponent(message)}`
      });

      if (!response.ok) {
        throw new Error(`ChatWork送信失敗: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const getNotificationTitle = (type: DiagnosisNotification['type']): string => {
    switch (type) {
      case 'new_diagnosis':
        return '新しい診断が完了しました';
      case 'user_registration':
        return '新規ユーザーが登録しました';
      case 'system_alert':
        return 'システムアラート';
      default:
        return '通知';
    }
  };

  const formatNotificationMessage = (notification: DiagnosisNotification): string => {
    const { type, userName, userEmail, userPhone, timestamp, message } = notification;
    
    let formattedMessage = `${getNotificationTitle(type)}\n\n`;
    formattedMessage += `ユーザー: ${userName}\n`;
    
    if (userEmail) {
      formattedMessage += `メール: ${userEmail}\n`;
    }
    
    if (userPhone) {
      formattedMessage += `電話: ${userPhone}\n`;
    }
    
    formattedMessage += `時刻: ${new Date(timestamp).toLocaleString('ja-JP')}\n\n`;
    formattedMessage += `詳細: ${message}`;
    
    return formattedMessage;
  };

  const formatSlackMessage = (notification: DiagnosisNotification): string => {
    const { type, userName, userEmail, timestamp, message } = notification;
    
    let slackMessage = `*${getNotificationTitle(type)}*\n\n`;
    slackMessage += `👤 ユーザー: ${userName}\n`;
    
    if (userEmail) {
      slackMessage += `📧 メール: ${userEmail}\n`;
    }
    
    slackMessage += `🕐 時刻: ${new Date(timestamp).toLocaleString('ja-JP')}\n\n`;
    slackMessage += `📝 詳細: ${message}`;
    
    return slackMessage;
  };

  const testNotification = async () => {
    setTestMode(true);
    const testNotificationData: DiagnosisNotification = {
      type: 'system_alert',
      userId: 'test-user-123',
      userName: 'テストユーザー',
      userEmail: 'test@example.com',
      userPhone: '080-1234-5678',
      timestamp: new Date().toISOString(),
      message: 'これはテスト通知です。通知システムが正常に動作しています。'
    };

    await sendNotification(testNotificationData);
    setTestMode(false);
  };

  return (
    <div className="notification-system">
      <h3 className="text-lg font-semibold mb-4">通知システム設定</h3>
      
      {/* 通知システム有効/無効 */}
      <div className="mb-6">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium">通知システムを有効にする</span>
        </label>
      </div>

      {settings.enabled && (
        <div className="space-y-6">
          {/* Email通知設定 */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">📧 Email通知</h4>
            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications.enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    emailNotifications: {
                      ...settings.emailNotifications,
                      enabled: e.target.checked
                    }
                  })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Email通知を有効にする</span>
              </label>
              
              {settings.emailNotifications.enabled && (
                <div className="ml-6 space-y-2">
                  <input
                    type="text"
                    placeholder="SMTPサーバー"
                    value={settings.emailNotifications.smtpServer}
                    onChange={(e) => setSettings({
                      ...settings,
                      emailNotifications: {
                        ...settings.emailNotifications,
                        smtpServer: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <input
                    type="number"
                    placeholder="ポート番号"
                    value={settings.emailNotifications.smtpPort}
                    onChange={(e) => setSettings({
                      ...settings,
                      emailNotifications: {
                        ...settings.emailNotifications,
                        smtpPort: parseInt(e.target.value)
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <input
                    type="text"
                    placeholder="送信者メールアドレス"
                    value={settings.emailNotifications.fromEmail}
                    onChange={(e) => setSettings({
                      ...settings,
                      emailNotifications: {
                        ...settings.emailNotifications,
                        fromEmail: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <textarea
                    placeholder="送信先メールアドレス（複数の場合は改行で区切る）"
                    value={settings.emailNotifications.toEmails.join('\n')}
                    onChange={(e) => setSettings({
                      ...settings,
                      emailNotifications: {
                        ...settings.emailNotifications,
                        toEmails: e.target.value.split('\n').filter(email => email.trim())
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm h-20"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Slack通知設定 */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">💬 Slack通知</h4>
            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.slackNotifications.enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    slackNotifications: {
                      ...settings.slackNotifications,
                      enabled: e.target.checked
                    }
                  })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Slack通知を有効にする</span>
              </label>
              
              {settings.slackNotifications.enabled && (
                <div className="ml-6 space-y-2">
                  <input
                    type="text"
                    placeholder="Webhook URL"
                    value={settings.slackNotifications.webhookUrl}
                    onChange={(e) => setSettings({
                      ...settings,
                      slackNotifications: {
                        ...settings.slackNotifications,
                        webhookUrl: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <input
                    type="text"
                    placeholder="チャンネル名（例: #general）"
                    value={settings.slackNotifications.channel}
                    onChange={(e) => setSettings({
                      ...settings,
                      slackNotifications: {
                        ...settings.slackNotifications,
                        channel: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              )}
            </div>
          </div>

          {/* LINE通知設定 */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">📱 LINE通知</h4>
            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.lineNotifications.enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    lineNotifications: {
                      ...settings.lineNotifications,
                      enabled: e.target.checked
                    }
                  })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">LINE通知を有効にする</span>
              </label>
              
              {settings.lineNotifications.enabled && (
                <div className="ml-6 space-y-2">
                  <input
                    type="text"
                    placeholder="LINE Bot Access Token"
                    value={settings.lineNotifications.accessToken}
                    onChange={(e) => setSettings({
                      ...settings,
                      lineNotifications: {
                        ...settings.lineNotifications,
                        accessToken: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <input
                    type="text"
                    placeholder="送信先ユーザーID"
                    value={settings.lineNotifications.userId}
                    onChange={(e) => setSettings({
                      ...settings,
                      lineNotifications: {
                        ...settings.lineNotifications,
                        userId: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              )}
            </div>
          </div>

          {/* ChatWork通知設定 */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">💼 ChatWork通知</h4>
            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.chatWorkNotifications.enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    chatWorkNotifications: {
                      ...settings.chatWorkNotifications,
                      enabled: e.target.checked
                    }
                  })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">ChatWork通知を有効にする</span>
              </label>
              
              {settings.chatWorkNotifications.enabled && (
                <div className="ml-6 space-y-2">
                  <input
                    type="text"
                    placeholder="ChatWork API Token"
                    value={settings.chatWorkNotifications.apiToken}
                    onChange={(e) => setSettings({
                      ...settings,
                      chatWorkNotifications: {
                        ...settings.chatWorkNotifications,
                        apiToken: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <input
                    type="text"
                    placeholder="ルームID"
                    value={settings.chatWorkNotifications.roomId}
                    onChange={(e) => setSettings({
                      ...settings,
                      chatWorkNotifications: {
                        ...settings.chatWorkNotifications,
                        roomId: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              )}
            </div>
          </div>

          {/* ボタン */}
          <div className="flex space-x-4">
            <button
              onClick={saveNotificationSettings}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? '保存中...' : '設定を保存'}
            </button>
            <button
              onClick={testNotification}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? 'テスト中...' : 'テスト通知'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationSystem;
export { NotificationSystem };