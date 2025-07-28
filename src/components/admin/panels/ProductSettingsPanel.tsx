import React, { useState, useEffect } from 'react';
import { FinancialProduct, Company } from '@/types';
import { AdminMessageHandlers } from '../AdminTypes';

interface ProductSettingsPanelProps {
  messageHandlers: AdminMessageHandlers;
}

const ProductSettingsPanel: React.FC<ProductSettingsPanelProps> = ({ messageHandlers }) => {
  const [products, setProducts] = useState<FinancialProduct[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'companies'>('products');
  const [isLoading, setIsLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<FinancialProduct | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);

  useEffect(() => {
    loadProductsAndCompanies();
  }, []);

  const loadProductsAndCompanies = async () => {
    try {
      setIsLoading(true);
      
      // sessionStorageから商品・会社データを読み込み
      const savedProducts = sessionStorage.getItem('financial_products');
      const savedCompanies = sessionStorage.getItem('companies');
      
      if (savedProducts) {
        setProducts(JSON.parse(savedProducts));
      }
      
      if (savedCompanies) {
        setCompanies(JSON.parse(savedCompanies));
      }
    } catch (error) {
      messageHandlers.handleError(error, '商品・会社データの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const saveProducts = async () => {
    try {
      setIsLoading(true);
      sessionStorage.setItem('financial_products', JSON.stringify(products));
      messageHandlers.showSuccess('商品データが保存されました');
    } catch (error) {
      messageHandlers.handleError(error, '商品データの保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const saveCompanies = async () => {
    try {
      setIsLoading(true);
      sessionStorage.setItem('companies', JSON.stringify(companies));
      messageHandlers.showSuccess('会社データが保存されました');
    } catch (error) {
      messageHandlers.handleError(error, '会社データの保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProduct = () => {
    setEditingProduct({
      id: '',
      name: '',
      description: '',
      category: 'stocks',
      riskLevel: 1,
      expectedReturn: 0,
      minimumInvestment: 0,
      features: [],
      pros: [],
      cons: [],
      companyId: '',
      isActive: true
    });
    setShowProductModal(true);
  };

  const handleEditProduct = (product: FinancialProduct) => {
    setEditingProduct(product);
    setShowProductModal(true);
  };

  const handleSaveProduct = () => {
    if (!editingProduct) return;

    if (!editingProduct.name || !editingProduct.description) {
      messageHandlers.handleError(new Error('必須項目を入力してください'), '商品名と説明は必須です');
      return;
    }

    if (editingProduct.id) {
      // 既存商品の更新
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? editingProduct : p));
    } else {
      // 新商品の追加
      const newProduct = { ...editingProduct, id: `product_${Date.now()}` };
      setProducts(prev => [...prev, newProduct]);
    }

    setShowProductModal(false);
    setEditingProduct(null);
    saveProducts();
  };

  const handleDeleteProduct = (productId: string) => {
    if (!confirm('この商品を削除してもよろしいですか？')) return;

    setProducts(prev => prev.filter(p => p.id !== productId));
    saveProducts();
  };

  const handleAddCompany = () => {
    setEditingCompany({
      id: '',
      name: '',
      description: '',
      website: '',
      rating: 0,
      establishedYear: new Date().getFullYear(),
      isActive: true
    });
    setShowCompanyModal(true);
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setShowCompanyModal(true);
  };

  const handleSaveCompany = () => {
    if (!editingCompany) return;

    if (!editingCompany.name || !editingCompany.description) {
      messageHandlers.handleError(new Error('必須項目を入力してください'), '会社名と説明は必須です');
      return;
    }

    if (editingCompany.id) {
      // 既存会社の更新
      setCompanies(prev => prev.map(c => c.id === editingCompany.id ? editingCompany : c));
    } else {
      // 新会社の追加
      const newCompany = { ...editingCompany, id: `company_${Date.now()}` };
      setCompanies(prev => [...prev, newCompany]);
    }

    setShowCompanyModal(false);
    setEditingCompany(null);
    saveCompanies();
  };

  const handleDeleteCompany = (companyId: string) => {
    if (!confirm('この会社を削除してもよろしいですか？')) return;

    setCompanies(prev => prev.filter(c => c.id !== companyId));
    saveCompanies();
  };

  const getCompanyName = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    return company ? company.name : '未設定';
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      stocks: '株式',
      bonds: '債券',
      funds: '投資信託',
      insurance: '保険',
      savings: '預金',
      crypto: '仮想通貨',
      real_estate: '不動産',
      commodities: '商品',
      other: 'その他'
    };
    return labels[category] || category;
  };

  const getRiskLevelLabel = (level: number) => {
    const labels: Record<number, string> = {
      1: '低リスク',
      2: '中低リスク',
      3: '中リスク',
      4: '中高リスク',
      5: '高リスク'
    };
    return labels[level] || `レベル${level}`;
  };

  const renderProductsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">金融商品管理</h3>
        <button
          onClick={handleAddProduct}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <i className="fas fa-plus mr-2"></i>
          商品追加
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                商品名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                カテゴリ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                リスクレベル
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                期待リターン
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                最低投資額
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                会社
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状態
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{product.name}</div>
                  <div className="text-sm text-gray-500 truncate max-w-xs">{product.description}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getCategoryLabel(product.category || '')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    (product.riskLevel ?? 0) <= 2 ? 'bg-green-100 text-green-800' :
                    (product.riskLevel ?? 0) <= 3 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {getRiskLevelLabel(product.riskLevel ?? 0)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.expectedReturn ?? 0}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {(product.minimumInvestment ?? 0).toLocaleString()}万円
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getCompanyName(product.companyId || '')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {product.isActive ? 'アクティブ' : '非アクティブ'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEditProduct(product)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCompaniesTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">会社管理</h3>
        <button
          onClick={handleAddCompany}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <i className="fas fa-plus mr-2"></i>
          会社追加
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                会社名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                説明
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                評価
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                設立年
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ウェブサイト
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状態
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {companies.map((company) => (
              <tr key={company.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{company.name}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 truncate max-w-xs">{company.description}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <i
                        key={i}
                        className={`fas fa-star text-sm ${
                          i < (company.rating || 0) ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                      ></i>
                    ))}
                    <span className="ml-2 text-sm text-gray-600">{company.rating || 0}/5</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {company.establishedYear}年
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                  {company.website && (
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      <i className="fas fa-external-link-alt mr-1"></i>
                      サイト
                    </a>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    company.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {company.isActive ? 'アクティブ' : '非アクティブ'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEditCompany(company)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDeleteCompany(company.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderProductModal = () => {
    if (!showProductModal || !editingProduct) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingProduct.id ? '商品編集' : '商品追加'}
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">商品名 *</label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="商品名を入力"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">カテゴリ</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="stocks">株式</option>
                    <option value="bonds">債券</option>
                    <option value="funds">投資信託</option>
                    <option value="insurance">保険</option>
                    <option value="savings">預金</option>
                    <option value="crypto">仮想通貨</option>
                    <option value="real_estate">不動産</option>
                    <option value="commodities">商品</option>
                    <option value="other">その他</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">リスクレベル (1-5)</label>
                  <select
                    value={editingProduct.riskLevel}
                    onChange={(e) => setEditingProduct({ ...editingProduct, riskLevel: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>1 - 低リスク</option>
                    <option value={2}>2 - 中低リスク</option>
                    <option value={3}>3 - 中リスク</option>
                    <option value={4}>4 - 中高リスク</option>
                    <option value={5}>5 - 高リスク</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">期待リターン (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingProduct.expectedReturn}
                    onChange={(e) => setEditingProduct({ ...editingProduct, expectedReturn: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="期待リターンを入力"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">最低投資額 (万円)</label>
                  <input
                    type="number"
                    value={editingProduct.minimumInvestment}
                    onChange={(e) => setEditingProduct({ ...editingProduct, minimumInvestment: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="最低投資額を入力"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">会社</label>
                  <select
                    value={editingProduct.companyId}
                    onChange={(e) => setEditingProduct({ ...editingProduct, companyId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">会社を選択</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">説明 *</label>
                <textarea
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="商品の説明を入力"
                />
              </div>
              
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editingProduct.isActive}
                    onChange={(e) => setEditingProduct({ ...editingProduct, isActive: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium">アクティブ</span>
                </label>
              </div>
              
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveProduct}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCompanyModal = () => {
    if (!showCompanyModal || !editingCompany) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-3xl shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingCompany.id ? '会社編集' : '会社追加'}
              </h3>
              <button
                onClick={() => setShowCompanyModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">会社名 *</label>
                  <input
                    type="text"
                    value={editingCompany.name}
                    onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="会社名を入力"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">設立年</label>
                  <input
                    type="number"
                    value={editingCompany.establishedYear}
                    onChange={(e) => setEditingCompany({ ...editingCompany, establishedYear: parseInt(e.target.value) || new Date().getFullYear() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="設立年を入力"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">評価 (1-5)</label>
                  <select
                    value={editingCompany.rating}
                    onChange={(e) => setEditingCompany({ ...editingCompany, rating: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>評価なし</option>
                    <option value={1}>1つ星</option>
                    <option value={2}>2つ星</option>
                    <option value={3}>3つ星</option>
                    <option value={4}>4つ星</option>
                    <option value={5}>5つ星</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ウェブサイト</label>
                  <input
                    type="url"
                    value={editingCompany.website}
                    onChange={(e) => setEditingCompany({ ...editingCompany, website: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">説明 *</label>
                <textarea
                  value={editingCompany.description}
                  onChange={(e) => setEditingCompany({ ...editingCompany, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="会社の説明を入力"
                />
              </div>
              
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editingCompany.isActive}
                    onChange={(e) => setEditingCompany({ ...editingCompany, isActive: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium">アクティブ</span>
                </label>
              </div>
              
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  onClick={() => setShowCompanyModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveCompany}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="product-settings-panel">
      <h2 className="text-xl font-semibold mb-6">商品・会社設定</h2>

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex">
          <button
            onClick={() => setActiveTab('products')}
            className={`py-2 px-4 border-b-2 font-medium text-sm ${
              activeTab === 'products'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            商品管理
          </button>
          <button
            onClick={() => setActiveTab('companies')}
            className={`py-2 px-4 border-b-2 font-medium text-sm ${
              activeTab === 'companies'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            会社管理
          </button>
        </nav>
      </div>

      {/* タブコンテンツ */}
      {activeTab === 'products' && renderProductsTab()}
      {activeTab === 'companies' && renderCompaniesTab()}

      {/* モーダル */}
      {renderProductModal()}
      {renderCompanyModal()}
    </div>
  );
};

export default ProductSettingsPanel;