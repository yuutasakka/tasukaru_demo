// ***********************************************************
// This file is processed and loaded automatically before component test files.
// ***********************************************************

import './commands';
import { mount } from 'cypress/react18';

// Augment the Cypress namespace to include type definitions for
// your custom command.
declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}

Cypress.Commands.add('mount', mount);

// グローバルスタイルのインポート
import '../../index.css';
import '../../src/styles/accessibility.css';

// コンポーネントテスト用の共通設定
beforeEach(() => {
  // モックの設定
  cy.stub(window, 'fetch');
  
  // LocalStorageモック
  const localStorageMock = {
    getItem: cy.stub(),
    setItem: cy.stub(),
    removeItem: cy.stub(),
    clear: cy.stub(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
  
  // SessionStorageモック
  const sessionStorageMock = {
    getItem: cy.stub(),
    setItem: cy.stub(),
    removeItem: cy.stub(),
    clear: cy.stub(),
  };
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true,
  });
});