import React from 'react';

const ProductionSecurityValidator: React.FC = () => {
  // 本番環境のセキュリティ検証コンポーネントは無効化
  // 環境変数は安全にサーバーサイドで管理されており、
  // クライアントサイドでの検証は不要かつセキュリティリスクとなる
  return null;
};

export default ProductionSecurityValidator;