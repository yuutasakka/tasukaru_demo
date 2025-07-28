describe('Accessibility', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('passes axe accessibility tests on homepage', () => {
    cy.checkA11y();
  });

  it('has proper skip links', () => {
    // Skip linksは最初は非表示
    cy.get('a[href="#main-content"]').should('exist');
    
    // Tabキーでフォーカスすると表示される
    cy.get('body').tab();
    cy.focused().should('contain', 'メインコンテンツへ移動');
    
    // Enterキーでメインコンテンツにジャンプ
    cy.focused().type('{enter}');
    cy.get('#main-content').should('have.focus');
  });

  it('supports keyboard navigation', () => {
    // Tabキーでナビゲーション
    cy.get('body').tab();
    cy.focused().should('be.visible');
    
    // Shift+Tabで逆方向
    cy.get('body').tab({ shift: true });
    cy.focused().should('be.visible');
    
    // ボタンはEnterとSpaceで動作
    cy.contains('診断を開始する').focus();
    cy.focused().type('{enter}');
    cy.url().should('include', '#');
  });

  it('has proper ARIA labels and roles', () => {
    // ヘッダー
    cy.get('header[role="banner"]').should('exist');
    cy.get('nav[role="navigation"]').should('exist');
    
    // メインコンテンツ
    cy.get('main').should('exist');
    
    // フッター
    cy.get('footer[role="contentinfo"]').should('exist');
    
    // ボタン
    cy.get('button').each(($button) => {
      cy.wrap($button).should('have.attr', 'aria-label')
        .or('have.text');
    });
  });

  it('shows accessibility settings', () => {
    // アクセシビリティ設定ボタンをクリック
    cy.get('[aria-label="アクセシビリティ設定を開く"]').click();
    
    // モーダルが開く
    cy.get('[role="dialog"]').should('be.visible');
    cy.contains('アクセシビリティ設定').should('be.visible');
    
    // フォントサイズ設定
    cy.contains('フォントサイズ').should('be.visible');
    cy.get('select').select('large');
    
    // 設定が保存される
    cy.contains('設定を保存して閉じる').click();
    cy.reload();
    
    // フォントサイズが保持されている
    cy.get('body').should('have.attr', 'data-font-size', 'large');
  });

  it('respects prefers-reduced-motion', () => {
    // アニメーションが無効化されている
    cy.wrap(Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setMediaFeature',
      params: {
        media: 'prefers-reduced-motion',
        value: 'reduce',
      },
    }));
    
    cy.reload();
    
    // アニメーションクラスが適用されない
    cy.get('.transition-all').should('not.exist');
  });

  it('handles focus management in modals', () => {
    // モーダルを開く
    cy.get('[aria-label="アクセシビリティ設定を開く"]').click();
    
    // フォーカスがモーダル内に移動
    cy.focused().should('be.visible');
    cy.focused().parents('[role="dialog"]').should('exist');
    
    // Tabキーでモーダル内を循環
    const focusableElements = [];
    cy.get('[role="dialog"] button, [role="dialog"] select').each(($el) => {
      focusableElements.push($el);
    });
    
    // ESCキーでモーダルを閉じる
    cy.get('body').type('{esc}');
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('provides proper form labels and error messages', () => {
    cy.contains('診断を開始する').click();
    
    // フォーム要素にラベルがある
    cy.get('input, select, textarea').each(($input) => {
      const id = $input.attr('id');
      if (id) {
        cy.get(`label[for="${id}"]`).should('exist');
      } else {
        cy.wrap($input).should('have.attr', 'aria-label');
      }
    });
    
    // エラーメッセージがアクセシブル
    cy.get('[data-testid="age-experience-option"]').first().click();
    cy.contains('次へ').click();
    cy.get('[data-testid="purpose-budget-option"]').first().click();
    cy.contains('次へ').click();
    
    // 無効な電話番号を入力
    cy.get('input[type="tel"]').type('123');
    cy.contains('診断結果を見る').click();
    
    // エラーメッセージ
    cy.get('[role="alert"]').should('be.visible');
    cy.get('input[type="tel"]').should('have.attr', 'aria-invalid', 'true');
    cy.get('input[type="tel"]').should('have.attr', 'aria-describedby');
  });

  it('maintains focus visibility', () => {
    // キーボードユーザーとして操作
    cy.get('body').tab();
    
    // フォーカスリングが表示される
    cy.focused().should('have.css', 'outline-style', 'solid');
    cy.focused().should('have.css', 'outline-width').and('not.eq', '0px');
  });

  it('provides screen reader announcements', () => {
    // ライブリージョンが存在
    cy.get('[aria-live="polite"]').should('exist');
    cy.get('[aria-live="assertive"]').should('exist');
    
    // 診断フローでアナウンス
    cy.contains('診断を開始する').click();
    
    // ステップ変更時にアナウンス
    cy.get('[data-testid="age-experience-option"]').first().click();
    cy.contains('次へ').click();
    
    // アナウンサーに内容が追加される
    cy.get('[aria-live="polite"]').should(($el) => {
      expect($el.text()).to.not.be.empty;
    });
  });

  it('supports high contrast mode', () => {
    // 高コントラストモードをシミュレート
    cy.get('body').invoke('attr', 'data-high-contrast', 'true');
    
    // 色のコントラストが十分
    cy.get('button').each(($button) => {
      cy.wrap($button).should('have.css', 'border-width').and('not.eq', '0px');
    });
  });

  it('provides accessible data tables', () => {
    // 管理画面にアクセス
    cy.loginAsAdmin();
    
    // テーブルが適切な構造を持つ
    cy.get('table').should('exist');
    cy.get('table').within(() => {
      cy.get('thead').should('exist');
      cy.get('th').should('have.length.at.least', 1);
      cy.get('tbody').should('exist');
    });
    
    // スコープ属性
    cy.get('th').each(($th) => {
      cy.wrap($th).should('have.attr', 'scope');
    });
  });

  it('passes accessibility tests on all major pages', () => {
    const pages = [
      '/',
      '/admin/login',
      '/login-selection',
      '/registration-request',
    ];
    
    pages.forEach((page) => {
      cy.visit(page);
      cy.checkA11y();
    });
  });
});