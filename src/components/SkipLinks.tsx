import React from 'react';
import { useKeyboardNavigation } from '../hooks/useAccessibility';

interface SkipLink {
  href: string;
  label: string;
}

interface SkipLinksProps {
  links?: SkipLink[];
}

const defaultLinks: SkipLink[] = [
  { href: '#main-content', label: 'メインコンテンツへ移動' },
  { href: '#navigation', label: 'ナビゲーションへ移動' },
  { href: '#footer', label: 'フッターへ移動' }
];

const SkipLinks: React.FC<SkipLinksProps> = ({ 
  links = defaultLinks 
}) => {
  const isKeyboardUser = useKeyboardNavigation();

  return (
    <div className="sr-only focus-within:not-sr-only">
      <nav aria-label="スキップリンク" className="bg-blue-600 p-2">
        <ul className="flex space-x-4">
          {links.map((link, index) => (
            <li key={index}>
              <a
                href={link.href}
                className={`
                  inline-block px-3 py-1 text-white bg-blue-700 rounded
                  hover:bg-blue-800 focus:bg-blue-800
                  focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2
                  transition-colors duration-200
                  ${isKeyboardUser ? 'ring-2 ring-white ring-offset-2' : ''}
                `}
                onClick={(e) => {
                  // スムーズスクロールを実装
                  e.preventDefault();
                  const target = document.querySelector(link.href);
                  if (target) {
                    target.scrollIntoView({ 
                      behavior: 'smooth',
                      block: 'start'
                    });
                    
                    // フォーカスを移動
                    if (target instanceof HTMLElement) {
                      target.setAttribute('tabindex', '-1');
                      target.focus();
                      target.addEventListener('blur', () => {
                        target.removeAttribute('tabindex');
                      }, { once: true });
                    }
                  }
                }}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default SkipLinks;