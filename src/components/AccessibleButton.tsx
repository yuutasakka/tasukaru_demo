import React, { forwardRef } from 'react';
import { useKeyboardNavigation, useReducedMotion } from '../hooks/useAccessibility';

interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(({
  variant = 'primary',
  size = 'medium',
  loading = false,
  loadingText = '読み込み中...',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled,
  children,
  className = '',
  ...props
}, ref) => {
  const isKeyboardUser = useKeyboardNavigation();
  const prefersReducedMotion = useReducedMotion();

  const baseClasses = `
    inline-flex items-center justify-center
    border border-transparent rounded-md
    font-medium focus:outline-none
    disabled:opacity-50 disabled:cursor-not-allowed
    ${isKeyboardUser ? 'focus:ring-2 focus:ring-offset-2' : ''}
    ${prefersReducedMotion ? '' : 'transition-all duration-200'}
    ${fullWidth ? 'w-full' : ''}
  `;

  const variantClasses = {
    primary: `
      bg-blue-600 hover:bg-blue-700 text-white
      ${isKeyboardUser ? 'focus:ring-blue-500' : ''}
    `,
    secondary: `
      bg-gray-200 hover:bg-gray-300 text-gray-900
      ${isKeyboardUser ? 'focus:ring-gray-500' : ''}
    `,
    danger: `
      bg-red-600 hover:bg-red-700 text-white
      ${isKeyboardUser ? 'focus:ring-red-500' : ''}
    `,
    ghost: `
      bg-transparent hover:bg-gray-100 text-gray-700
      border-gray-300
      ${isKeyboardUser ? 'focus:ring-gray-500' : ''}
    `
  };

  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-sm',
    large: 'px-6 py-3 text-base'
  };

  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-describedby={loading ? 'loading-status' : undefined}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <>
          <svg
            className={`animate-spin -ml-1 mr-2 h-4 w-4 ${prefersReducedMotion ? '' : 'motion-reduce:animate-none'}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="sr-only" id="loading-status">
            {loadingText}
          </span>
        </>
      )}
      
      {!loading && icon && iconPosition === 'left' && (
        <span className="mr-2" aria-hidden="true">
          {icon}
        </span>
      )}
      
      {loading ? loadingText : children}
      
      {!loading && icon && iconPosition === 'right' && (
        <span className="ml-2" aria-hidden="true">
          {icon}
        </span>
      )}
    </button>
  );
});

AccessibleButton.displayName = 'AccessibleButton';

export default AccessibleButton;