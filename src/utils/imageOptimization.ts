// 画像最適化ユーティリティ

interface ImageSizes {
  mobile: number;
  tablet: number;
  desktop: number;
}

interface OptimizedImageProps {
  src: string;
  sizes?: ImageSizes;
  formats?: string[];
}

/**
 * レスポンシブ画像のsrcSetを生成
 */
export const generateSrcSet = (
  baseSrc: string,
  sizes: number[] = [320, 640, 768, 1024, 1280, 1920]
): string => {
  const extension = baseSrc.split('.').pop();
  const baseUrl = baseSrc.replace(`.${extension}`, '');
  
  return sizes
    .map(size => `${baseUrl}-${size}w.${extension} ${size}w`)
    .join(', ');
};

/**
 * 画像のsizesプロパティを生成
 */
export const generateSizes = (sizes: ImageSizes): string => {
  return `
    (max-width: 640px) ${sizes.mobile}px,
    (max-width: 1024px) ${sizes.tablet}px,
    ${sizes.desktop}px
  `.trim();
};

/**
 * WebP/AVIF対応のpicture要素用ソースを生成
 */
export const generatePictureSources = ({
  src,
  sizes = { mobile: 320, tablet: 768, desktop: 1280 },
  formats = ['avif', 'webp']
}: OptimizedImageProps) => {
  const sources = [];
  const extension = src.split('.').pop();
  const baseUrl = src.replace(`.${extension}`, '');
  
  // 各フォーマットのソースを生成
  formats.forEach(format => {
    sources.push({
      type: `image/${format}`,
      srcSet: generateSrcSet(`${baseUrl}.${format}`),
      sizes: generateSizes(sizes)
    });
  });
  
  // フォールバック用の元の形式
  sources.push({
    type: `image/${extension}`,
    srcSet: generateSrcSet(src),
    sizes: generateSizes(sizes)
  });
  
  return sources;
};

/**
 * 画像URLをCDN URLに変換
 */
export const getCDNUrl = (src: string, params?: Record<string, any>): string => {
  // Vercel Image Optimization APIを使用する場合
  if (process.env.NODE_ENV === 'production' && src.startsWith('/')) {
    const baseUrl = '/_vercel/image';
    const queryParams = new URLSearchParams({
      url: src,
      w: params?.width || '1920',
      q: params?.quality || '75',
      ...params
    });
    return `${baseUrl}?${queryParams.toString()}`;
  }
  
  // Cloudinary等の外部CDNを使用する場合
  // const CLOUDINARY_URL = 'https://res.cloudinary.com/your-cloud-name/image/upload';
  // return `${CLOUDINARY_URL}/w_${params?.width || 'auto'},q_${params?.quality || 'auto'},f_auto/${src}`;
  
  return src;
};

/**
 * 画像の遅延読み込み用Intersection Observerオプション
 */
export const lazyLoadOptions: IntersectionObserverInit = {
  root: null,
  rootMargin: '50px 0px',
  threshold: 0.01
};

/**
 * 画像のプリロード
 */
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * 重要な画像をプリロード（LCP最適化）
 */
export const preloadCriticalImages = (images: string[]) => {
  if (typeof window === 'undefined') return;
  
  images.forEach(src => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    
    // WebP対応の場合
    if (src.includes('.webp')) {
      link.type = 'image/webp';
    }
    
    document.head.appendChild(link);
  });
};

/**
 * ブラープレースホルダーの生成（Base64）
 */
export const generateBlurPlaceholder = (width: number = 20, height: number = 15): string => {
  // 実際の実装では、サーバーサイドで画像を縮小してBase64エンコードする
  // ここでは簡易的なSVGプレースホルダーを返す
  const aspectRatio = height / width;
  return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"%3E%3Crect width="${width}" height="${height}" fill="%23f3f4f6"/%3E%3C/svg%3E`;
};

/**
 * 画像最適化の設定
 */
export const imageOptimizationConfig = {
  formats: ['avif', 'webp', 'jpg'],
  sizes: [320, 640, 768, 1024, 1280, 1920, 2560],
  quality: {
    thumbnail: 60,
    default: 75,
    high: 90
  },
  breakpoints: {
    mobile: 640,
    tablet: 1024,
    desktop: 1280
  }
};