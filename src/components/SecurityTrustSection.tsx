

import React, { useState, useEffect } from 'react';
import { SecurityFeature } from '../../types'; // Assuming SecurityFeature might be enhanced later

// デフォルトデータ（Supabaseから取得できない場合のフォールバック）
const defaultSecurityData = [
  { 
    iconClass: 'fas fa-lock', 
    title: 'SSL暗号化', 
    description: '最高水準のセキュリティでお客様の情報を保護',
  },
  { 
    iconClass: 'fas fa-university', 
    title: '金融庁登録', 
    description: '関東財務局長（金商）登録済み',
  },
  { 
    iconClass: 'fas fa-certificate', 
    title: 'プライバシーマーク', 
    description: '個人情報保護の第三者認証取得',
  },
  { 
    iconClass: 'fas fa-comment-slash', 
    title: '営業電話なし', 
    description: 'お客様からのご依頼がない限り連絡いたしません',
  },
];

interface SecurityTrustItem {
  id?: string;
  iconClass: string;
  title: string;
  description: string;
  display_order?: number;
}

const SecurityTrustSection: React.FC = () => {
  const [securityData, setSecurityData] = useState<SecurityTrustItem[]>(defaultSecurityData);

  useEffect(() => {
    // Supabaseから安心・安全への取り組みデータを取得
    const loadSecurityTrustData = async () => {
      try {
        // Supabase設定は別の方法で取得
        const supabaseConfig = { 
          url: '', 
          key: '' 
        };
        
        // Supabase設定を確認
        if (!supabaseConfig.url || !supabaseConfig.key || 
            supabaseConfig.url.includes('your-project') || 
            supabaseConfig.key.includes('your-anon-key')) {
          return;
        }

        // Supabaseから取得
        const response = await fetch(
          `${supabaseConfig.url}/rest/v1/security_trust_settings?is_active=eq.true&order=display_order.asc`,
          {
            headers: {
              'Authorization': `Bearer ${supabaseConfig.key}`,
              'apikey': supabaseConfig.key,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            const formattedData = data.map((item: any) => ({
              id: item.id,
              iconClass: item.icon_class,
              title: item.title,
              description: item.description,
              display_order: item.display_order
            }));
            setSecurityData(formattedData);
          }
        } else if (response.status === 400) {
        } else {
        }
      } catch (error) {
      }
    };

    loadSecurityTrustData();
  }, []);
  return (
    <section className="py-16 md:py-20 px-4" style={{ background: '#F7F9FC' }}>
      <div className="container mx-auto px-4 max-w-7xl">
        <style>{`
          .luxury-card {
            background: #FFFFFF;
            border: 1px solid #ECF0F1;
            border-radius: 1.5rem;
            padding: 2rem;
            box-shadow: 0 4px 12px rgba(44, 62, 80, 0.08);
          }
          
          .security-badge-icon-container {
            width: 4rem;
            height: 4rem;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1rem auto;
            font-size: 1.5rem;
            color: #2C3E50;
            transition: all 0.3s ease;
            border: 2px solid #2C3E50;
          }
          
          .security-badge-icon-container:hover {
            transform: scale(1.1);
            background: rgba(255, 255, 255, 0.2);
            box-shadow: 0 0 30px rgba(44, 62, 80, 0.1);
            border-color: #34495E;
          }
          
          @media (max-width: 768px) {
            .luxury-card {
              padding: 1.5rem;
            }
            
            .security-badge-icon-container {
              width: 3rem;
              height: 3rem;
              font-size: 1.25rem;
            }
          }
          
          @media (max-width: 480px) {
            .luxury-card {
              padding: 1.25rem;
            }
            
            .security-badge-icon-container {
              width: 2.5rem;
              height: 2.5rem;
              font-size: 1rem;
            }
          }
        `}</style>
        <div className="luxury-card">
          <h3 className="text-2xl md:text-3xl lg:text-4xl text-center mb-12 font-bold leading-tight" style={{ color: '#2C3E50' }}>
            安心・安全への取り組み
          </h3>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10 text-center">
            {securityData.map(item => (
              <div key={item.title} className="p-4 flex flex-col items-center">
                <div className="security-badge-icon-container" aria-hidden="true">
                  <i className={item.iconClass}></i>
                </div>
                <div className="security-badge mb-3" style={{ color: '#F39C12', fontWeight: 'bold' }}>{item.title}</div>
                <p className="text-sm" style={{ color: '#34495E' }}>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SecurityTrustSection;