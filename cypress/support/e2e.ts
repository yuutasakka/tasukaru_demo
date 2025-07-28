// ***********************************************************
// This file is processed and loaded automatically before test files.
// ***********************************************************

import './commands';
import 'cypress-axe';

// グローバル設定
Cypress.on('uncaught:exception', (err, runnable) => {
  // React開発モードのエラーを無視
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  if (err.message.includes('ResizeObserver loop completed with undelivered notifications')) {
    return false;
  }
  // その他のエラーは通常通り処理
  return true;
});

// テスト前の共通処理
beforeEach(() => {
  // クッキー、ローカルストレージ、セッションストレージをクリア
  cy.clearCookies();
  cy.clearLocalStorage();
  cy.clearSessionStorage();
  
  // ビューポートサイズを設定
  cy.viewport(1280, 720);
  
  // APIモックの設定
  cy.intercept('GET', '**/api/health', { statusCode: 200, body: { status: 'ok' } });
  
  // Supabase APIのモック
  cy.intercept('GET', '**/auth/v1/user', {
    statusCode: 200,
    body: { user: null },
  });
  
  // 静的アセットのモック（パフォーマンス向上）
  cy.intercept('GET', '**/*.jpg', { fixture: 'placeholder.jpg' });
  cy.intercept('GET', '**/*.png', { fixture: 'placeholder.png' });
  cy.intercept('GET', '**/*.svg', { fixture: 'placeholder.svg' });
});

// テスト後の共通処理
afterEach(() => {
  // スクリーンショットを保存（失敗時のみ）
  if (Cypress.currentTest.state === 'failed') {
    const testName = Cypress.currentTest.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    cy.screenshot(`failed_${testName}`);
  }
});