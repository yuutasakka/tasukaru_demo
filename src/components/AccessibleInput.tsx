import React, { forwardRef, useId } from 'react';
import { useAriaLabel, useReducedMotion } from '../hooks/useAccessibility';

interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helpText?: string;
  required?: boolean;
  invalid?: boolean;
  showOptionalLabel?: boolean;
}

const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(({
  label,
  error,
  helpText,
  required = false,
  invalid = false,
  showOptionalLabel = true,
  className = '',
  ...props
}, ref) => {
  const inputId = useId();
  const errorId = useId();
  const helpId = useId();
  const prefersReducedMotion = useReducedMotion();
  
  const ariaLabel = useAriaLabel(
    label,
    required ? '必須' : (showOptionalLabel ? '任意' : undefined)
  );

  const transitionClass = prefersReducedMotion 
    ? '' 
    : 'transition-colors duration-200';

  return (
    <div className="space-y-2">
      <label 
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && (
          <span 
            className="text-red-500 ml-1" 
            aria-label="必須"
          >
            *
          </span>
        )}
        {!required && showOptionalLabel && (
          <span className="text-gray-500 ml-1 text-xs">
            (任意)
          </span>
        )}
      </label>
      
      <input
        ref={ref}
        id={inputId}
        aria-label={ariaLabel}
        aria-invalid={invalid || !!error}
        aria-describedby={[
          helpText ? helpId : null,
          error ? errorId : null
        ].filter(Boolean).join(' ') || undefined}
        aria-required={required}
        className={`
          block w-full px-3 py-2 border rounded-md shadow-sm
          ${invalid || error 
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
          }
          focus:outline-none focus:ring-1 ${transitionClass}
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${className}
        `}
        {...props}
      />
      
      {helpText && (
        <p 
          id={helpId}
          className="text-sm text-gray-600"
          role="note"
        >
          {helpText}
        </p>
      )}
      
      {error && (
        <p 
          id={errorId}
          className="text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          <span className="sr-only">エラー: </span>
          {error}
        </p>
      )}
    </div>
  );
});

AccessibleInput.displayName = 'AccessibleInput';

export default AccessibleInput;