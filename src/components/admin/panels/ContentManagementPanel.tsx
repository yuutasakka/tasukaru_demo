import React, { useState, useEffect } from 'react';
import { AdminMessageHandlers } from '../AdminTypes';
import { MainVisualData, HeaderData, FooterData } from '@/data/homepageContentData';

interface ContentManagementPanelProps {
  messageHandlers: AdminMessageHandlers;
}

interface ContentData {
  mainVisual: MainVisualData;
  header: HeaderData;
  footer: FooterData;
}

interface ExtendedMainVisualData extends MainVisualData {
  description: string;
  buttonText: string;
  backgroundImage: string;
  heroImage: string;
}

interface ExtendedHeaderData extends HeaderData {
  logo: string;
  navigation: Array<{ text: string; link: string }>;
  ctaButton: { text: string; link: string };
}

interface ExtendedFooterData extends FooterData {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  socialLinks: Array<{ name: string; url: string; icon: string }>;
  legalLinks: Array<{ name: string; url: string }>;
}

const ContentManagementPanel: React.FC<ContentManagementPanelProps> = ({ messageHandlers }) => {
  const [contentData, setContentData] = useState<{
    mainVisual: ExtendedMainVisualData;
    header: ExtendedHeaderData;
    footer: ExtendedFooterData;
  }>({
    mainVisual: {
      title: '',
      highlightWord: '',
      subtitle: '',
      description: '',
      buttonText: '',
      backgroundImage: '',
      heroImage: ''
    },
    header: {
      title: '',
      subtitle: '',
      logo: '',
      navigation: [],
      ctaButton: { text: '', link: '' }
    },
    footer: {
      siteName: '',
      description: '',
      companyInfo: '',
      contactInfo: '',
      copyright: '',
      companyName: '',
      address: '',
      phone: '',
      email: '',
      socialLinks: [],
      legalLinks: []
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'mainVisual' | 'header' | 'footer'>('mainVisual');

  useEffect(() => {
    loadContentData();
  }, []);

  const loadContentData = async () => {
    try {
      setIsLoading(true);
      
      // sessionStorageから既存のコンテンツデータを読み込み
      const savedMainVisual = sessionStorage.getItem('homepage_main_visual');
      const savedHeader = sessionStorage.getItem('homepage_header');
      const savedFooter = sessionStorage.getItem('homepage_footer');

      if (savedMainVisual || savedHeader || savedFooter) {
        setContentData({
          mainVisual: savedMainVisual ? JSON.parse(savedMainVisual) : contentData.mainVisual,
          header: savedHeader ? JSON.parse(savedHeader) : contentData.header,
          footer: savedFooter ? JSON.parse(savedFooter) : contentData.footer
        });
      }
    } catch (error) {
      messageHandlers.handleError(error, 'コンテンツデータの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const saveContentData = async () => {
    try {
      setIsLoading(true);
      
      // sessionStorageに保存
      sessionStorage.setItem('homepage_main_visual', JSON.stringify(contentData.mainVisual));
      sessionStorage.setItem('homepage_header', JSON.stringify(contentData.header));
      sessionStorage.setItem('homepage_footer', JSON.stringify(contentData.footer));
      
      messageHandlers.showSuccess('コンテンツが保存されました');
    } catch (error) {
      messageHandlers.handleError(error, 'コンテンツの保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMainVisualChange = (field: keyof ExtendedMainVisualData, value: string) => {
    setContentData(prev => ({
      ...prev,
      mainVisual: {
        ...prev.mainVisual,
        [field]: value
      }
    }));
  };

  const handleHeaderChange = (field: keyof ExtendedHeaderData, value: any) => {
    setContentData(prev => ({
      ...prev,
      header: {
        ...prev.header,
        [field]: value
      }
    }));
  };

  const handleFooterChange = (field: keyof ExtendedFooterData, value: any) => {
    setContentData(prev => ({
      ...prev,
      footer: {
        ...prev.footer,
        [field]: value
      }
    }));
  };

  const addNavigationItem = () => {
    const newNav = [...contentData.header.navigation, { text: '', link: '' }];
    handleHeaderChange('navigation', newNav);
  };

  const updateNavigationItem = (index: number, field: 'text' | 'link', value: string) => {
    const newNav = [...contentData.header.navigation];
    newNav[index] = { ...newNav[index], [field]: value };
    handleHeaderChange('navigation', newNav);
  };

  const removeNavigationItem = (index: number) => {
    const newNav = contentData.header.navigation.filter((_, i) => i !== index);
    handleHeaderChange('navigation', newNav);
  };

  const addSocialLink = () => {
    const newSocial = [...contentData.footer.socialLinks, { name: '', url: '', icon: '' }];
    handleFooterChange('socialLinks', newSocial);
  };

  const updateSocialLink = (index: number, field: 'name' | 'url' | 'icon', value: string) => {
    const newSocial = [...contentData.footer.socialLinks];
    newSocial[index] = { ...newSocial[index], [field]: value };
    handleFooterChange('socialLinks', newSocial);
  };

  const removeSocialLink = (index: number) => {
    const newSocial = contentData.footer.socialLinks.filter((_, i) => i !== index);
    handleFooterChange('socialLinks', newSocial);
  };

  const addLegalLink = () => {
    const newLegal = [...contentData.footer.legalLinks, { name: '', url: '' }];
    handleFooterChange('legalLinks', newLegal);
  };

  const updateLegalLink = (index: number, field: 'name' | 'url', value: string) => {
    const newLegal = [...contentData.footer.legalLinks];
    newLegal[index] = { ...newLegal[index], [field]: value };
    handleFooterChange('legalLinks', newLegal);
  };

  const removeLegalLink = (index: number) => {
    const newLegal = contentData.footer.legalLinks.filter((_, i) => i !== index);
    handleFooterChange('legalLinks', newLegal);
  };

  const renderMainVisualTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">メインビジュアル設定</h3>
      
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">メインタイトル</label>
          <input
            type="text"
            value={contentData.mainVisual.title}
            onChange={(e) => handleMainVisualChange('title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="メインタイトルを入力"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">サブタイトル</label>
          <input
            type="text"
            value={contentData.mainVisual.subtitle}
            onChange={(e) => handleMainVisualChange('subtitle', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="サブタイトルを入力"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">説明文</label>
          <textarea
            value={contentData.mainVisual.description}
            onChange={(e) => handleMainVisualChange('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="説明文を入力"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">ボタンテキスト</label>
          <input
            type="text"
            value={contentData.mainVisual.buttonText}
            onChange={(e) => handleMainVisualChange('buttonText', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ボタンテキストを入力"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">背景画像URL</label>
          <input
            type="url"
            value={contentData.mainVisual.backgroundImage}
            onChange={(e) => handleMainVisualChange('backgroundImage', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="背景画像のURLを入力"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">ヒーロー画像URL</label>
          <input
            type="url"
            value={contentData.mainVisual.heroImage}
            onChange={(e) => handleMainVisualChange('heroImage', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ヒーロー画像のURLを入力"
          />
        </div>
      </div>
    </div>
  );

  const renderHeaderTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">ヘッダー設定</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">ロゴURL</label>
        <input
          type="url"
          value={contentData.header.logo}
          onChange={(e) => handleHeaderChange('logo', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="ロゴ画像のURLを入力"
        />
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">ナビゲーション</label>
          <button
            onClick={addNavigationItem}
            className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            追加
          </button>
        </div>
        
        <div className="space-y-2">
          {contentData.header.navigation.map((nav, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={nav.text}
                onChange={(e) => updateNavigationItem(index, 'text', e.target.value)}
                placeholder="メニュー名"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="url"
                value={nav.link}
                onChange={(e) => updateNavigationItem(index, 'link', e.target.value)}
                placeholder="リンクURL"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => removeNavigationItem(index)}
                className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">CTAボタン</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={contentData.header.ctaButton.text}
            onChange={(e) => handleHeaderChange('ctaButton', { ...contentData.header.ctaButton, text: e.target.value })}
            placeholder="ボタンテキスト"
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="url"
            value={contentData.header.ctaButton.link}
            onChange={(e) => handleHeaderChange('ctaButton', { ...contentData.header.ctaButton, link: e.target.value })}
            placeholder="リンクURL"
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );

  const renderFooterTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">フッター設定</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">会社名</label>
          <input
            type="text"
            value={contentData.footer.companyName}
            onChange={(e) => handleFooterChange('companyName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="会社名を入力"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">住所</label>
          <input
            type="text"
            value={contentData.footer.address}
            onChange={(e) => handleFooterChange('address', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="住所を入力"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">電話番号</label>
          <input
            type="tel"
            value={contentData.footer.phone}
            onChange={(e) => handleFooterChange('phone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="電話番号を入力"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">メールアドレス</label>
          <input
            type="email"
            value={contentData.footer.email}
            onChange={(e) => handleFooterChange('email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="メールアドレスを入力"
          />
        </div>
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">SNSリンク</label>
          <button
            onClick={addSocialLink}
            className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            追加
          </button>
        </div>
        
        <div className="space-y-2">
          {contentData.footer.socialLinks.map((social, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={social.name}
                onChange={(e) => updateSocialLink(index, 'name', e.target.value)}
                placeholder="SNS名"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="url"
                value={social.url}
                onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                placeholder="URL"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={social.icon}
                onChange={(e) => updateSocialLink(index, 'icon', e.target.value)}
                placeholder="アイコン"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => removeSocialLink(index)}
                className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">法的リンク</label>
          <button
            onClick={addLegalLink}
            className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            追加
          </button>
        </div>
        
        <div className="space-y-2">
          {contentData.footer.legalLinks.map((legal, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={legal.name}
                onChange={(e) => updateLegalLink(index, 'name', e.target.value)}
                placeholder="リンク名"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="url"
                value={legal.url}
                onChange={(e) => updateLegalLink(index, 'url', e.target.value)}
                placeholder="URL"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => removeLegalLink(index)}
                className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">コピーライト</label>
        <input
          type="text"
          value={contentData.footer.copyright}
          onChange={(e) => handleFooterChange('copyright', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="© 2024 Your Company. All rights reserved."
        />
      </div>
    </div>
  );

  return (
    <div className="content-management-panel">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">コンテンツ管理</h2>
        <button
          onClick={saveContentData}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? '保存中...' : '保存'}
        </button>
      </div>

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex">
          <button
            onClick={() => setActiveTab('mainVisual')}
            className={`py-2 px-4 border-b-2 font-medium text-sm ${
              activeTab === 'mainVisual'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            メインビジュアル
          </button>
          <button
            onClick={() => setActiveTab('header')}
            className={`py-2 px-4 border-b-2 font-medium text-sm ${
              activeTab === 'header'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ヘッダー
          </button>
          <button
            onClick={() => setActiveTab('footer')}
            className={`py-2 px-4 border-b-2 font-medium text-sm ${
              activeTab === 'footer'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            フッター
          </button>
        </nav>
      </div>

      {/* タブコンテンツ */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        {activeTab === 'mainVisual' && renderMainVisualTab()}
        {activeTab === 'header' && renderHeaderTab()}
        {activeTab === 'footer' && renderFooterTab()}
      </div>
    </div>
  );
};

export default ContentManagementPanel;