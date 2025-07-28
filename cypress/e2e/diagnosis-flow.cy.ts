describe('診断フローE2Eテスト', () => {
  beforeEach(() => {
    // アプリケーションのホームページを開く
    cy.visit('http://localhost:8080');
  });

  it('完全な診断フローを実行できる', () => {
    // 1. 診断開始
    cy.contains('今すぐ無料で診断を始める').click();

    // 2. 診断フォームが表示される
    cy.contains('あなたに最適な金融商品を診断').should('be.visible');
    
    // 3. 質問1に回答
    cy.contains('年齢と投資経験').should('be.visible');
    cy.contains('20代・投資未経験').click();

    // 4. 質問2に回答
    cy.contains('投資の目的と予算').should('be.visible');
    cy.contains('資産形成・月1万円以下').click();

    // 5. 電話番号入力
    cy.contains('診断結果を受け取る').should('be.visible');
    cy.get('input[placeholder*="090-1234-5678"]').type('09012345678');
    cy.contains('button', '診断結果を受け取る').click();

    // 6. SMS認証画面
    cy.contains('SMS認証').should('be.visible');
    cy.contains('09012345678').should('be.visible');
    
    // 7. 認証コード送信
    cy.contains('認証コードを送信').click();
    
    // 8. 認証コード入力（テスト環境では123456で成功）
    cy.get('input[placeholder*="6桁の数字"]').should('be.visible');
    cy.get('input[placeholder*="6桁の数字"]').type('123456');
    
    // 9. 認証実行
    cy.contains('button', '認証する').click();
    
    // 10. 診断結果画面
    cy.contains('診断結果', { timeout: 10000 }).should('be.visible');
    cy.contains('あなたに最適なプラン').should('be.visible');
  });

  it('診断を途中でキャンセルできる', () => {
    // 診断開始
    cy.contains('今すぐ無料で診断を始める').click();
    
    // 診断フォームが表示される
    cy.contains('あなたに最適な金融商品を診断').should('be.visible');
    
    // キャンセルボタンをクリック
    cy.get('[aria-label="診断を中止"]').click();
    
    // ホーム画面に戻る
    cy.contains('今すぐ無料で診断を始める').should('be.visible');
  });

  it('戻るボタンで前の質問に戻れる', () => {
    // 診断開始
    cy.contains('今すぐ無料で診断を始める').click();
    
    // 質問1に回答
    cy.contains('20代・投資未経験').click();
    
    // 質問2が表示される
    cy.contains('投資の目的と予算').should('be.visible');
    
    // 戻るボタンをクリック
    cy.get('[aria-label="前の質問に戻る"]').click();
    
    // 質問1に戻る
    cy.contains('年齢と投資経験').should('be.visible');
  });

  it('無効な電話番号でエラーが表示される', () => {
    // 診断を進める
    cy.contains('今すぐ無料で診断を始める').click();
    cy.contains('20代・投資未経験').click();
    cy.contains('資産形成・月1万円以下').click();
    
    // 無効な電話番号を入力
    cy.get('input[placeholder*="090-1234-5678"]').type('123');
    cy.contains('button', '診断結果を受け取る').click();
    
    // エラーメッセージが表示される
    cy.contains('正しい電話番号を入力してください').should('be.visible');
  });

  it('レスポンシブデザインが機能する', () => {
    // モバイルビューポート
    cy.viewport('iphone-x');
    cy.contains('今すぐ無料で診断を始める').should('be.visible');
    
    // タブレットビューポート
    cy.viewport('ipad-2');
    cy.contains('今すぐ無料で診断を始める').should('be.visible');
    
    // デスクトップビューポート
    cy.viewport(1920, 1080);
    cy.contains('今すぐ無料で診断を始める').should('be.visible');
  });

  it('プログレスバーが正しく更新される', () => {
    // 診断開始
    cy.contains('今すぐ無料で診断を始める').click();
    
    // 初期状態（33%）
    cy.get('[role="progressbar"]').should('have.attr', 'aria-valuenow', '33');
    
    // 質問1に回答（66%）
    cy.contains('20代・投資未経験').click();
    cy.get('[role="progressbar"]').should('have.attr', 'aria-valuenow', '66');
    
    // 質問2に回答（100%）
    cy.contains('資産形成・月1万円以下').click();
    cy.get('[role="progressbar"]').should('have.attr', 'aria-valuenow', '100');
  });

  it('電話番号変更機能が動作する', () => {
    // 診断を進めて電話番号入力まで
    cy.contains('今すぐ無料で診断を始める').click();
    cy.contains('20代・投資未経験').click();
    cy.contains('資産形成・月1万円以下').click();
    
    // 電話番号を入力して送信
    cy.get('input[placeholder*="090-1234-5678"]').type('09012345678');
    cy.contains('button', '診断結果を受け取る').click();
    
    // SMS認証画面で電話番号変更
    cy.contains('電話番号を変更').click();
    
    // 新しい番号を入力
    cy.get('input[placeholder*="090-1234-5678"]').clear().type('08011112222');
    cy.contains('変更を確定').click();
    
    // 新しい番号が表示される
    cy.contains('08011112222').should('be.visible');
  });

  it('認証コード再送信タイマーが動作する', () => {
    // SMS認証画面まで進む
    cy.contains('今すぐ無料で診断を始める').click();
    cy.contains('20代・投資未経験').click();
    cy.contains('資産形成・月1万円以下').click();
    cy.get('input[placeholder*="090-1234-5678"]').type('09012345678');
    cy.contains('button', '診断結果を受け取る').click();
    
    // 認証コード送信
    cy.contains('認証コードを送信').click();
    
    // 再送信ボタンが無効化されている
    cy.contains('秒後に再送信可能').should('be.visible');
    cy.contains('秒後に再送信可能').should('be.disabled');
    
    // 60秒待つ（実際のテストでは時間を短縮する設定を使用）
    cy.wait(2000); // デモ用に2秒待機
    
    // タイマーがカウントダウンしている
    cy.contains(/\d+秒後に再送信可能/).should('be.visible');
  });
});

describe('アクセシビリティE2Eテスト', () => {
  beforeEach(() => {
    cy.visit('http://localhost:8080');
  });

  it('キーボードナビゲーションが機能する', () => {
    // Tabキーでフォーカス移動
    cy.get('body').tab();
    cy.focused().should('have.attr', 'href', '#main-content');
    
    // Enterキーでボタンをクリック
    cy.contains('今すぐ無料で診断を始める').focus();
    cy.focused().type('{enter}');
    
    // 診断フォームが表示される
    cy.contains('あなたに最適な金融商品を診断').should('be.visible');
  });

  it('スクリーンリーダー用のARIA属性が適切に設定されている', () => {
    // ARIAラベル
    cy.get('[aria-label]').should('exist');
    
    // ARIAロール
    cy.get('[role="button"]').should('exist');
    cy.get('[role="progressbar"]').should('exist');
    
    // ARIA説明
    cy.get('[aria-describedby]').should('exist');
  });

  it('ハイコントラストモードが適用される', () => {
    // アクセシビリティ設定を開く
    cy.get('[aria-label="アクセシビリティ設定"]').click();
    
    // ハイコントラストモードを有効化
    cy.contains('ハイコントラストモード').click();
    
    // スタイルが変更されている
    cy.get('body').should('have.css', 'filter').and('include', 'contrast');
  });
});