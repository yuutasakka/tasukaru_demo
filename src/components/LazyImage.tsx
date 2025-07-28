import React, { useState, useEffect, useRef } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  srcSet?: string;
  sizes?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%23f3f4f6"/%3E%3C/svg%3E',
  srcSet,
  sizes,
  width,
  height,
  loading = 'lazy',
  onLoad,
  onError
}) => {
  const [imageSrc, setImageSrc] = useState<string>(placeholder);
  const [imageRef, setImageRef] = useState<string | undefined>();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let observer: IntersectionObserver;
    
    if (loading === 'lazy' && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // 画像が表示領域に入ったら読み込み開始
              setImageRef(src);
              observer.unobserve(entry.target);
            }
          });
        },
        {
          rootMargin: '50px 0px', // 50px手前から読み込み開始
          threshold: 0.01
        }
      );

      if (imgRef.current) {
        observer.observe(imgRef.current);
      }
    } else {
      // Intersection Observerがサポートされていない場合は即座に読み込み
      setImageRef(src);
    }

    return () => {
      if (observer && imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [src, loading]);

  useEffect(() => {
    if (!imageRef) return;

    // 画像のプリロード
    const img = new Image();
    
    img.onload = () => {
      setImageSrc(imageRef);
      setIsLoaded(true);
      setIsError(false);
      onLoad?.();
    };
    
    img.onerror = () => {
      setIsError(true);
      setIsLoaded(true);
      onError?.();
    };
    
    img.src = imageRef;
    
    if (srcSet) {
      img.srcset = srcSet;
    }
  }, [imageRef, srcSet, onLoad, onError]);

  // エラー時のフォールバック画像
  const errorFallback = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%236b7280" font-family="sans-serif" font-size="16"%3E画像を読み込めません%3C/text%3E%3C/svg%3E';

  return (
    <div className={`relative ${className}`}>
      <img
        ref={imgRef}
        src={isError ? errorFallback : imageSrc}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        loading={loading}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        style={{
          // アスペクト比を維持
          aspectRatio: width && height ? `${width}/${height}` : undefined
        }}
      />
      
      {/* ローディングインジケーター */}
      {!isLoaded && !isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* ブラー効果（オプション） */}
      {!isLoaded && !isError && placeholder && (
        <img
          src={placeholder}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-cover filter blur-lg ${className}`}
        />
      )}
    </div>
  );
};

export default LazyImage;