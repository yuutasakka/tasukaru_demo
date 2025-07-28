/// <reference types="cypress" />

// カスタムコマンドの型定義
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * アクセシビリティチェックを実行
       */
      checkA11y(
        context?: string | Node | axe.ContextObject | undefined,
        options?: axe.RunOptions | undefined
      ): void;

      /**
       * 管理者としてログイン
       */
      loginAsAdmin(): void;

      /**
       * 診断フローを完了
       */
      completeDiagnosisFlow(data: {
        age: string;
        experience: string;
        purpose: string;
        amount: string;
        timing: string;
        phone: string;
      }): void;

      /**
       * 電話番号認証を完了（モック）
       */
      completePhoneVerification(phoneNumber: string): void;

      /**
       * ローカルストレージをクリア
       */
      clearLocalStorage(): void;

      /**
       * セッションストレージをクリア
       */
      clearSessionStorage(): void;

      /**
       * Supabaseセッションを設定（モック）
       */
      setSupabaseSession(user?: any): void;

      /**
       * アクセシビリティ設定を変更
       */
      setAccessibilitySettings(settings: {
        fontSize?: 'small' | 'medium' | 'large';
      }): void;
    }
  }
}

// アクセシビリティチェック
Cypress.Commands.add('checkA11y', (context, options) => {
  cy.injectAxe();
  cy.checkA11y(context, options);
});

// 管理者ログイン
Cypress.Commands.add('loginAsAdmin', () => {
  cy.visit('/admin/login');
  cy.get('input[type="text"]').type('admin');
  cy.get('input[type="password"]').type('Admin@123456!');
  cy.get('button[type="submit"]').click();
  cy.url().should('include', '/admin/dashboard');
});

// 診断フロー完了
Cypress.Commands.add('completeDiagnosisFlow', (data) => {
  cy.visit('/');
  
  // Step 1: 年齢と経験
  cy.get('[data-testid="age-experience-20-none"]').click();
  cy.get('[data-testid="next-button"]').click();
  
  // Step 2: 目的と予算
  cy.get('[data-testid="purpose-budget-retirement-10k"]').click();
  cy.get('[data-testid="next-button"]').click();
  
  // Step 3: 電話番号
  cy.get('input[type="tel"]').type(data.phone);
  cy.get('[data-testid="submit-button"]').click();
});

// 電話番号認証完了（モック）
Cypress.Commands.add('completePhoneVerification', (phoneNumber: string) => {
  // APIをインターセプト
  cy.intercept('POST', '**/api/send-otp', {
    statusCode: 200,
    body: { success: true, message: 'OTP sent successfully' },
  }).as('sendOTP');

  cy.intercept('POST', '**/api/verify-otp', {
    statusCode: 200,
    body: { success: true, token: 'mock-token' },
  }).as('verifyOTP');

  // OTP入力
  cy.get('input[name="otp"]').type('123456');
  cy.get('button[type="submit"]').click();
  
  cy.wait('@verifyOTP');
});

// ローカルストレージクリア
Cypress.Commands.add('clearLocalStorage', () => {
  cy.window().then((win) => {
    win.localStorage.clear();
  });
});

// セッションストレージクリア
Cypress.Commands.add('clearSessionStorage', () => {
  cy.window().then((win) => {
    win.sessionStorage.clear();
  });
});

// Supabaseセッション設定
Cypress.Commands.add('setSupabaseSession', (user = null) => {
  cy.window().then((win) => {
    const session = user ? {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user,
    } : null;
    
    win.localStorage.setItem(
      'supabase.auth.token',
      JSON.stringify(session)
    );
  });
});

// アクセシビリティ設定
Cypress.Commands.add('setAccessibilitySettings', (settings) => {
  cy.window().then((win) => {
    if (settings.fontSize) {
      win.localStorage.setItem('accessibility-font-size', settings.fontSize);
    }
  });
});

export {};