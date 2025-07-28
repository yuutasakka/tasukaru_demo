import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { suppressDevelopmentErrors } from './src/utils/errorSuppression';
// import './src/utils/productionLogger'; // 本番環境でのログ無効化
// import { initSentry } from './src/utils/sentry';
// import { setupServiceWorker } from './src/utils/registerSW';
// import './src/i18n/config'; // i18n初期化

// Sentryの初期化
// initSentry();

// Service Workerの登録
// if ('serviceWorker' in navigator) {
//   setupServiceWorker();
// }

// 開発環境でのエラー抑制
if (process.env.NODE_ENV === 'development') {
  suppressDevelopmentErrors();
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);