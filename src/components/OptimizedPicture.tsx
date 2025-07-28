import React from 'react';
import LazyImage from './LazyImage';
import { generatePictureSources, getCDNUrl, generateBlurPlaceholder } from '../utils/imageOptimization';

interface OptimizedPictureProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  sizes?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  quality?: number;
  onLoad?: () => void;
  onError?: () => void;
}

const OptimizedPicture: React.FC<OptimizedPictureProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  sizes = { mobile: 320, tablet: 768, desktop: 1280 },
  loading = 'lazy',
  priority = false,
  quality = 75,
  onLoad,
  onError
}) => {
  // 優先度の高い画像は即座に読み込む
  const actualLoading = priority ? 'eager' : loading;
  
  // picture要素用のソースを生成
  const sources = generatePictureSources({
    src,
    sizes,
    formats: ['avif', 'webp'] // 最新フォーマットを優先
  });
  
  // ブラープレースホルダー
  const placeholder = generateBlurPlaceholder(20, height && width ? Math.round(20 * height / width) : 15);
  
  // CDN URLの生成
  const optimizedSrc = getCDNUrl(src, { width: sizes.desktop, quality });
  
  // Native lazy loadingをサポートしているかチェック
  const supportsLazyLoading = 'loading' in HTMLImageElement.prototype;
  
  // picture要素をサポートしているかチェック
  const supportsPicture = 'HTMLPictureElement' in window;
  
  if (!supportsPicture || !supportsLazyLoading) {
    // フォールバック: LazyImageコンポーネントを使用
    return (
      <LazyImage
        src={optimizedSrc}
        alt={alt}
        className={className}
        placeholder={placeholder}
        width={width}
        height={height}
        loading={actualLoading}
        onLoad={onLoad}
        onError={onError}
      />
    );
  }
  
  return (
    <picture className={`block ${className}`}>
      {/* 最新フォーマットのソース */}
      {sources.map((source, index) => (
        <source
          key={index}
          type={source.type}
          srcSet={source.srcSet}
          sizes={source.sizes}
        />
      ))}
      
      {/* フォールバック画像 */}
      <img
        src={optimizedSrc}
        alt={alt}
        width={width}
        height={height}
        loading={actualLoading}
        className={`w-full h-auto ${className}`}
        onLoad={onLoad}
        onError={onError}
        decoding="async"
        // 重要な画像の場合はfetchpriorityを設定
        {...(priority && { fetchpriority: 'high' } as any)}
      />
    </picture>
  );
};

export default OptimizedPicture;