import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  title = 'タスカル - お金診断アプリ',
  description = 'あなたに最適な金融商品を診断します。簡単な質問に答えるだけで、プロのファイナンシャルアドバイザーが厳選した金融商品をご提案。',
  keywords = '金融商品,資産運用,投資診断,お金診断,ファイナンシャルプランニング,資産形成,投資信託,NISA',
  image = '/pwa-512x512.png',
  url = typeof window !== 'undefined' ? window.location.href : 'https://taskal.jp',
  type = 'website',
  author = 'タスカル Team',
  publishedTime,
  modifiedTime
}) => {
  const siteName = 'タスカル';
  const twitterHandle = '@aiconectx';
  
  // 構造化データ - Organization
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteName,
    url: 'https://taskal.jp',
    logo: 'https://taskal.jp/pwa-512x512.png',
    sameAs: [
      'https://twitter.com/aiconectx',
      'https://www.facebook.com/aiconectx',
      'https://www.linkedin.com/company/aiconectx'
    ]
  };

  // 構造化データ - WebApplication
  const webAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: siteName,
    description: description,
    url: 'https://taskal.jp',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'JPY'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1024'
    }
  };

  // 構造化データ - FAQPage
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'タスカルは無料で利用できますか？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'はい、タスカルは完全無料でご利用いただけます。診断から商品のご提案まで、一切費用はかかりません。'
        }
      },
      {
        '@type': 'Question',
        name: '診断にはどのくらい時間がかかりますか？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '診断は約3分で完了します。簡単な5つの質問に答えるだけで、あなたに最適な金融商品をご提案します。'
        }
      },
      {
        '@type': 'Question',
        name: '個人情報は安全に管理されますか？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'はい、お客様の個人情報は最高水準のセキュリティで保護されています。SSL暗号化通信を使用し、厳重に管理しています。'
        }
      }
    ]
  };

  // 構造化データ - BreadcrumbList
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'ホーム',
        item: 'https://taskal.jp'
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: '診断',
        item: 'https://taskal.jp/diagnosis'
      }
    ]
  };

  return (
    <Helmet>
      {/* 基本的なメタタグ */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author} />
      <link rel="canonical" href={url} />
      
      {/* Open Graph タグ */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="ja_JP" />
      
      {/* Twitter Card タグ */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={twitterHandle} />
      <meta name="twitter:creator" content={twitterHandle} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      
      {/* 追加のメタタグ */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      
      {/* Article specific meta tags */}
      {type === 'article' && publishedTime && (
        <>
          <meta property="article:published_time" content={publishedTime} />
          {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
          <meta property="article:author" content={author} />
        </>
      )}
      
      {/* 構造化データ */}
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(webAppSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </script>
      
      {/* 検索エンジン向けの追加情報 */}
      <meta name="geo.region" content="JP" />
      <meta name="geo.placename" content="Japan" />
      <meta name="language" content="Japanese" />
      <meta name="rating" content="general" />
      
      {/* パフォーマンス最適化 */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
      <link rel="dns-prefetch" href="https://www.google-analytics.com" />
    </Helmet>
  );
};

export default SEOHead;