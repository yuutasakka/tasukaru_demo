import React, { useState, useEffect } from 'react';
import { Testimonial } from '../../types';
import { defaultTestimonialsData } from '../../data/testimonialsData';
import { defaultReasonsToChooseData } from '../../data/homepageContentData';
import { secureLog } from '../config/clientSecurity';
import { createSupabaseClient } from './adminUtils';
import { useDesignTemplate } from '../../src/contexts/DesignSettingsContext';

const createSupabaseHelper = () => {
  const config = createSupabaseClient();
  return {
    from: (table: string) => ({
      select: (columns: string = '*') => ({
        eq: (column: string, value: any) => ({
          single: async () => {
            try {
              const response = await fetch(`${config.url}/rest/v1/${table}?${column}.eq=${value}&select=${columns}`, {
                headers: {
                  'apikey': config.key,
                  'Authorization': `Bearer ${config.key}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (!response.ok) {
                const errorData = await response.text();
                secureLog(`Supabase request failed: ${response.status} ${response.statusText}`, errorData);
                return { data: null, error: { message: `HTTP ${response.status}: ${response.statusText}`, status: response.status } };
              }
              
              const data = await response.json();
              
              if (Array.isArray(data)) {
                if (data.length === 0) {
                  return { data: null, error: { message: 'No rows found', code: 'PGRST116' } };
                } else if (data.length === 1) {
                  return { data: data[0], error: null };
                } else {
                  return { data: null, error: { message: 'Multiple rows found', code: 'PGRST116' } };
                }
              } else {
                return { data: data, error: null };
              }
            } catch (error) {
              secureLog('Supabase fetch error:', error);
              return { data: null, error: { message: error instanceof Error ? error.message : 'Network error' } };
            }
          }
        })
      })
    })
  };
};

const ReliabilitySection: React.FC = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isClient, setIsClient] = useState(false);
  // 一時的にデフォルトデータを強制使用（キャッシング・ファクタリング対応）
  const reasonsData = defaultReasonsToChooseData;
  const { templateConfig } = useDesignTemplate();
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const loadTestimonials = async () => {
      try {
        // APIエンドポイントから直接取得を試行
        const response = await fetch('/api/testimonials', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.data && Array.isArray(result.data) && result.data.length > 0) {
            // APIレスポンスの形式をフロントエンドの形式に変換
            const formattedTestimonials = result.data.map((item: any) => ({
              id: item.id,
              nameAndRole: item.name_and_role,
              avatarEmoji: item.avatar_emoji,
              ratingStars: item.rating_stars,
              text: item.text
            }));
            setTestimonials(formattedTestimonials);
            secureLog(`お客様の声を${formattedTestimonials.length}件読み込みました`);
            return;
          }
        }
        
        // APIが利用できない場合はデフォルトデータを使用
        secureLog('APIが利用できないため、デフォルトデータを使用します');
        setTestimonials(defaultTestimonialsData);
      } catch (error) {
        secureLog('お客様の声の読み込みエラー:', error);
        // エラーの場合もデフォルトデータを使用
        setTestimonials(defaultTestimonialsData);
      }
    };

    loadTestimonials();
  }, []);


  return (
    <section id="reliability-section" className="py-16 md:py-20 px-4" style={{ background: '#FFFFFF' }}>
      <div className="container mx-auto px-4 max-w-7xl">
        <style>{`
          /* 確実なレイアウト保証 */
          .grid {
            display: grid !important;
          }
          
          .md\\:grid-cols-3 {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
          
          .gap-8 {
            gap: 2rem !important;
          }
          
          .mb-16 {
            margin-bottom: 4rem !important;
          }
          
          .text-center {
            text-align: center !important;
          }
          
          .container {
            max-width: 80rem !important;
            margin: 0 auto !important;
            padding: 0 1rem !important;
          }
          
          .stats-card {
            background: #FFFFFF !important;
            border: 1px solid #ECF0F1 !important;
            border-radius: 1.5rem !important;
            padding: 2rem !important;
            text-align: center !important;
            box-shadow: 0 4px 20px rgba(44, 62, 80, 0.06) !important;
            transition: all 0.3s ease !important;
            width: 100% !important;
            display: block !important;
          }
          
          .stats-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 30px rgba(44, 62, 80, 0.1) !important;
            border-color: #F39C12 !important;
          }
          
          .stats-number {
            font-size: 2.5rem;
            font-weight: 800;
            color: #F39C12;
            margin-bottom: 0.5rem;
          }
          
          .testimonial-card {
            background: #FFFFFF;
            border: 1px solid #ECF0F1;
            border-radius: 1rem;
            padding: 1.5rem;
            box-shadow: 0 2px 15px rgba(44, 62, 80, 0.06);
            transition: all 0.3s ease;
          }
          
          .testimonial-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px -4px rgba(44, 62, 80, 0.12);
          }
          
          @media (max-width: 768px) {
            .stats-card {
              padding: 1.5rem;
            }
            
            .stats-number {
              font-size: 2rem;
            }
            
            .testimonial-card {
              padding: 1rem;
            }
          }
          
          @media (max-width: 480px) {
            .stats-card {
              padding: 1.25rem;
            }
            
            .stats-number {
              font-size: 1.75rem;
            }
          }
          
          /* 確実なレスポンシブ対応 */
          @media (max-width: 768px) {
            .md\\:grid-cols-3 {
              grid-template-columns: 1fr !important;
            }
            
            .grid {
              gap: 1rem !important;
            }
          }
        `}</style>
        <div className="text-center mb-16">
          <h3 className="text-3xl md:text-4xl lg:text-5xl mb-6 font-bold leading-tight" style={{ color: '#2C3E50' }}>
            {reasonsData.title}
          </h3>
          <p className="text-lg md:text-xl max-w-2xl mx-auto leading-relaxed" style={{ color: '#34495E' }}>
            {reasonsData.subtitle}
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 mb-16" style={{ 
          display: 'grid', 
          gridTemplateColumns: isClient && window.innerWidth > 768 ? 'repeat(3, minmax(0, 1fr))' : '1fr', 
          gap: '2rem', 
          marginBottom: '4rem' 
        }}>
          {reasonsData.reasons.map((reason, index) => (
            <div key={reason.title} className={`stats-card ${templateConfig?.styles.sections.layout === 'timeline' ? 'timeline-item' : ''}`} style={{ animationDelay: reason.animationDelay }}>
              <div className="stats-number">{reason.value}</div>
              <h4 className="text-xl font-semibold mb-2" style={{ color: '#2C3E50' }}>{reason.title}</h4>
              <p style={{ color: '#34495E' }}>{reason.description}</p>
            </div>
          ))}
        </div>
        
        <div className="mb-16">
          <h4 className="text-2xl md:text-3xl font-bold text-center mb-12" style={{ color: '#2C3E50' }}>お客様の声</h4>
          {testimonials.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-8" style={{ 
              display: 'grid', 
              gridTemplateColumns: isClient && window.innerWidth > 768 ? 'repeat(2, minmax(0, 1fr))' : '1fr',
              gap: '2rem' 
            }}>
              {testimonials.map(testimonial => (
                <div key={testimonial.id} className="testimonial-card">
                  <div className="flex items-center mb-4">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center mr-4 text-xl"
                      style={{ background: '#F39C12', color: 'white'}}
                      aria-hidden="true"
                    >
                      {testimonial.avatarEmoji}
                    </div>
                    <div>
                      <p className="font-semibold" style={{color: '#2C3E50'}}>
                        {testimonial.nameAndRole}
                      </p>
                      <div style={{color: '#F39C12'}}>
                        {'★'.repeat(testimonial.ratingStars || 5)}{'☆'.repeat(5 - (testimonial.ratingStars || 5))}
                      </div>
                    </div>
                  </div>
                  <p style={{ color: '#34495E' }}>{testimonial.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center p-6 rounded-lg" style={{ color: '#34495E', background: '#F8FAFC' }}>現在、お客様の声は登録されていません。</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default ReliabilitySection;