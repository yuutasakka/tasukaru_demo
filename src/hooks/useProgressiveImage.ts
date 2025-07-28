import { useState, useEffect } from 'react';
import { preloadImage } from '../utils/imageOptimization';

interface UseProgressiveImageProps {
  lowQualitySrc: string;
  highQualitySrc: string;
  disabled?: boolean;
}

interface UseProgressiveImageReturn {
  src: string;
  isLoading: boolean;
  isError: boolean;
  blur: boolean;
}

/**
 * プログレッシブ画像読み込みフック
 * 低品質画像から高品質画像へ段階的に切り替える
 */
export const useProgressiveImage = ({
  lowQualitySrc,
  highQualitySrc,
  disabled = false
}: UseProgressiveImageProps): UseProgressiveImageReturn => {
  const [src, setSrc] = useState<string>(lowQualitySrc);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [blur, setBlur] = useState(true);

  useEffect(() => {
    if (disabled) {
      setSrc(highQualitySrc);
      setIsLoading(false);
      setBlur(false);
      return;
    }

    let isMounted = true;

    const loadImage = async () => {
      try {
        // 高品質画像をプリロード
        await preloadImage(highQualitySrc);
        
        if (isMounted) {
          setSrc(highQualitySrc);
          setBlur(false);
          setIsLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          setIsError(true);
          setIsLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [lowQualitySrc, highQualitySrc, disabled]);

  return { src, isLoading, isError, blur };
};

/**
 * ビューポートベースの画像サイズ選択フック
 */
export const useResponsiveImageSrc = (
  imageSources: { [key: string]: string },
  breakpoints: { [key: string]: number } = {
    mobile: 640,
    tablet: 1024,
    desktop: 1280
  }
): string => {
  const [src, setSrc] = useState<string>('');

  useEffect(() => {
    const updateImageSrc = () => {
      const width = window.innerWidth;
      
      if (width <= breakpoints.mobile) {
        setSrc(imageSources.mobile || imageSources.default);
      } else if (width <= breakpoints.tablet) {
        setSrc(imageSources.tablet || imageSources.default);
      } else {
        setSrc(imageSources.desktop || imageSources.default);
      }
    };

    updateImageSrc();

    // デバウンスされたリサイズハンドラー
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateImageSrc, 150);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [imageSources, breakpoints]);

  return src;
};

/**
 * ネットワーク速度に基づく画像品質の自動調整
 */
export const useAdaptiveImageQuality = (): 'low' | 'medium' | 'high' => {
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateQuality = () => {
        // ネットワーク速度に基づいて品質を調整
        if (connection.saveData) {
          setQuality('low');
        } else if (connection.effectiveType) {
          switch (connection.effectiveType) {
            case 'slow-2g':
            case '2g':
              setQuality('low');
              break;
            case '3g':
              setQuality('medium');
              break;
            case '4g':
            default:
              setQuality('high');
          }
        }
      };

      updateQuality();
      connection.addEventListener('change', updateQuality);

      return () => {
        connection.removeEventListener('change', updateQuality);
      };
    }
  }, []);

  return quality;
};