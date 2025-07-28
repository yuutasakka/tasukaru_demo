import React, { forwardRef, useId } from 'react';
import { useAriaLabel, useReducedMotion } from '../hooks/useAccessibility';

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface AccessibleSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label: string;
  options: Option[];
  placeholder?: string;
  error?: string;
  helpText?: string;
  required?: boolean;
  invalid?: boolean;
  showOptionalLabel?: boolean;
}

const AccessibleSelect = forwardRef<HTMLSelectElement, AccessibleSelectProps>(({
  label,
  options,
  placeholder = '選択してください',
  error,
  helpText,
  required = false,
  invalid = false,
  showOptionalLabel = true,
  className = '',
  ...props
}, ref) => {
  const selectId = useId();
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
        htmlFor={selectId}
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
      
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-label={ariaLabel}
          aria-invalid={invalid || !!error}
          aria-describedby={[
            helpText ? helpId : null,
            error ? errorId : null
          ].filter(Boolean).join(' ') || undefined}
          aria-required={required}
          className={`
            block w-full px-3 py-2 pr-10 border rounded-md shadow-sm
            bg-white cursor-pointer
            ${invalid || error 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }
            focus:outline-none focus:ring-1 ${transitionClass}
            disabled:bg-gray-100 disabled:cursor-not-allowed
            appearance-none
            ${className}
          `}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        
        {/* カスタム矢印アイコン */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg 
            className="h-5 w-5 text-gray-400" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 20 20" 
            fill="currentColor"
            aria-hidden="true"
          >
            <path 
              fillRule="evenodd" 
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
      </div>
      
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

AccessibleSelect.displayName = 'AccessibleSelect';

export default AccessibleSelect;