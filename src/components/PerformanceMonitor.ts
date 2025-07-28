// 開発環境専用パフォーマンス測定ユーティリティ

export const PERF_TARGETS = {
  top: 2000, // ms
  diagnosis: 500,
  smsSend: 3000,
  smsVerify: 1000,
  result: 3000,
};

export function measurePageLoad(label = 'トップ画面', threshold = PERF_TARGETS.top) {
  if (process.env.NODE_ENV === 'production') return;
  const startTime = performance.now();
  window.addEventListener('load', () => {
    const endTime = performance.now();
    const loadTime = endTime - startTime;
    if (loadTime > threshold) {
    }
  });
}

export function measureTransition(label: string, threshold: number) {
  if (process.env.NODE_ENV === 'production') return;
  const start = performance.now();
  return () => {
    const end = performance.now();
    const time = end - start;
    if (time > threshold) {
    }
  };
}

export async function measureAsync(label: string, threshold: number, fn: () => Promise<any>) {
  if (process.env.NODE_ENV === 'production') return await fn();
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  const time = end - start;
  if (time > threshold) {
  }
  return result;
} 