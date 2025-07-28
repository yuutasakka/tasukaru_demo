import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESモジュール用の__dirname代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// OpenAPI仕様書を読み込み
const swaggerDocument = YAML.load(path.join(__dirname, '../src/api/openapi.yaml'));

// Swagger UIのカスタムCSS
const customCss = `
  .swagger-ui .topbar { display: none }
  .swagger-ui .info .title { color: #3b82f6; }
  .swagger-ui .btn.authorize { background-color: #3b82f6; }
  .swagger-ui .btn.authorize:hover { background-color: #2563eb; }
`;

// Swagger UIのオプション
const options = {
  customCss,
  customSiteTitle: "タスカル API Documentation",
  customfavIcon: "/favicon.ico",
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    displayOperationId: false,
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1,
    docExpansion: 'list',
    validatorUrl: null
  }
};

/**
 * Swagger UIをExpressアプリケーションに追加
 */
export function setupSwagger(app: express.Application): void {
  // API仕様書のJSONエンドポイント
  app.get('/api-docs/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocument);
  });

  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));

  // リダイレクト（便利のため）
  app.get('/docs', (req, res) => {
    res.redirect('/api-docs');
  });

}

/**
 * 開発環境用のモックサーバー設定
 */
export function setupMockEndpoints(app: express.Application): void {
  // モックレスポンスの設定
  const mockResponses = {
    '/v1/auth/login': {
      success: true,
      data: {
        user: {
          id: 'mock-user-id',
          email: 'test@example.com',
          role: 'user',
          createdAt: new Date().toISOString()
        },
        tokens: {
          accessToken: 'mock-jwt-token',
          refreshToken: 'mock-refresh-token',
          expiresIn: 3600
        }
      }
    },
    '/v1/sms/send-code': {
      success: true,
      message: '認証コードを送信しました'
    },
    '/v1/sms/verify-code': {
      success: true,
      verified: true,
      message: '認証成功'
    },
    '/v1/diagnosis/submit': {
      id: 'diagnosis-123',
      recommendedProducts: [
        {
          id: 'product-1',
          name: 'つみたてNISA対象投資信託',
          type: 'fund',
          description: '初心者向けの分散投資商品',
          riskLevel: 'low',
          expectedReturn: 3.5,
          minInvestment: 10000
        }
      ],
      riskLevel: 'low',
      estimatedReturns: {
        yearly: 35000,
        total: 700000
      },
      createdAt: new Date().toISOString()
    }
  };

  // モックエンドポイントの設定
  Object.entries(mockResponses).forEach(([endpoint, response]) => {
    app.post(endpoint, (req, res) => {
      // 開発環境でのレート制限ヘッダー
      res.setHeader('X-RateLimit-Limit', '100');
      res.setHeader('X-RateLimit-Remaining', '99');
      res.setHeader('X-RateLimit-Reset', String(Date.now() + 3600000));
      
      // 遅延を追加（実際のAPIのような感じを出すため）
      setTimeout(() => {
        res.json(response);
      }, 500);
    });
  });

  // GETエンドポイントのモック
  app.get('/v1/admin/analytics/summary', (req, res) => {
    res.json({
      totalUsers: 1234,
      verifiedUsers: 890,
      totalDiagnoses: 2456,
      conversionRate: 0.72,
      popularProducts: [
        { productId: 'product-1', count: 567 },
        { productId: 'product-2', count: 432 }
      ],
      userGrowth: [
        { date: '2024-01-01', count: 100 },
        { date: '2024-01-02', count: 120 },
        { date: '2024-01-03', count: 145 }
      ]
    });
  });

}

/**
 * APIバージョニングのミドルウェア
 */
export function apiVersioning(): express.RequestHandler {
  return (req, res, next) => {
    // APIバージョンをレスポンスヘッダーに追加
    res.setHeader('X-API-Version', '1.0.0');
    
    // 非推奨APIの警告
    if (req.path.includes('/v0/')) {
      res.setHeader('X-API-Deprecated', 'true');
      res.setHeader('X-API-Deprecation-Date', '2024-12-31');
      res.setHeader('X-API-Replacement', req.path.replace('/v0/', '/v1/'));
    }
    
    next();
  };
}