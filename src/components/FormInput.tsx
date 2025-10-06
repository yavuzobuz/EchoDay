import React, { forwardRef } from 'react';

interface BaseInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  className?: string;
  containerClassName?: string;
}

interface TextInputProps extends BaseInputProps, React.InputHTMLAttributes<HTMLInputElement> {
  type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'search';
}

interface TextAreaProps extends BaseInputProps, React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  rows?: number;
}

interface SelectProps extends BaseInputProps, React.SelectHTMLAttributes<HTMLSelectElement> {
  options: Array<{ value: string; label: string }>;
}

// Text Input Component
export const FormInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, error, helperText, required, className = '', containerClassName = '', ...props }, ref) => {
    return (
      <div className={`space-y-2 ${containerClassName}`}>
        {label && (
          <label className="block text-sm md:text-xs font-medium text-gray-700 dark:text-gray-300">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-4 py-3 md:px-3 md:py-2
            text-base md:text-sm
            border rounded-lg
            ${error 
              ? 'border-red-500 dark:border-red-400 focus:ring-red-500' 
              : 'border-gray-300 dark:border-gray-600 focus:ring-[var(--accent-color-500)]'
            }
            bg-white dark:bg-gray-700
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-500
            focus:ring-2 focus:outline-none
            transition-colors duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            min-h-[48px] md:min-h-[40px]
            ${className}
          `}
          {...props}
        />
        {error && (
          <div className="flex items-start gap-1.5 text-red-600 dark:text-red-400">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-xs md:text-xs">{error}</p>
          </div>
        )}
        {helperText && !error && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

// TextArea Component
export const FormTextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, helperText, required, rows = 4, className = '', containerClassName = '', ...props }, ref) => {
    return (
      <div className={`space-y-2 ${containerClassName}`}>
        {label && (
          <label className="block text-sm md:text-xs font-medium text-gray-700 dark:text-gray-300">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          rows={rows}
          className={`
            w-full px-4 py-3 md:px-3 md:py-2
            text-base md:text-sm
            border rounded-lg
            ${error 
              ? 'border-red-500 dark:border-red-400 focus:ring-red-500' 
              : 'border-gray-300 dark:border-gray-600 focus:ring-[var(--accent-color-500)]'
            }
            bg-white dark:bg-gray-700
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-500
            focus:ring-2 focus:outline-none
            transition-colors duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            resize-y
            min-h-[100px]
            ${className}
          `}
          {...props}
        />
        {error && (
          <div className="flex items-start gap-1.5 text-red-600 dark:text-red-400">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-xs md:text-xs">{error}</p>
          </div>
        )}
        {helperText && !error && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

FormTextArea.displayName = 'FormTextArea';

// Select Component
export const FormSelect = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, required, options, className = '', containerClassName = '', ...props }, ref) => {
    return (
      <div className={`space-y-2 ${containerClassName}`}>
        {label && (
          <label className="block text-sm md:text-xs font-medium text-gray-700 dark:text-gray-300">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          className={`
            w-full px-4 py-3 md:px-3 md:py-2
            text-base md:text-sm
            border rounded-lg
            ${error 
              ? 'border-red-500 dark:border-red-400 focus:ring-red-500' 
              : 'border-gray-300 dark:border-gray-600 focus:ring-[var(--accent-color-500)]'
            }
            bg-white dark:bg-gray-700
            text-gray-900 dark:text-white
            focus:ring-2 focus:outline-none
            transition-colors duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            min-h-[48px] md:min-h-[40px]
            ${className}
          `}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <div className="flex items-start gap-1.5 text-red-600 dark:text-red-400">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-xs md:text-xs">{error}</p>
          </div>
        )}
        {helperText && !error && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

FormSelect.displayName = 'FormSelect';

// Checkbox Component
interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  helperText?: string;
  containerClassName?: string;
}

export const FormCheckbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, helperText, containerClassName = '', ...props }, ref) => {
    return (
      <div className={`space-y-1 ${containerClassName}`}>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            ref={ref}
            type="checkbox"
            className="
              mt-1 w-5 h-5 md:w-4 md:h-4
              rounded border-gray-300 dark:border-gray-600
              text-[var(--accent-color-600)]
              focus:ring-2 focus:ring-[var(--accent-color-500)]
              focus:ring-offset-0
              transition-colors
              cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            {...props}
          />
          <div className="flex-1">
            <span className="text-sm md:text-xs text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
              {label}
            </span>
            {helperText && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{helperText}</p>
            )}
          </div>
        </label>
      </div>
    );
  }
);

FormCheckbox.displayName = 'FormCheckbox';

// Button Component (bonus)
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
}

export const FormButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    fullWidth = false, 
    loading = false,
    disabled,
    className = '', 
    ...props 
  }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-medium rounded-lg
      focus:outline-none focus:ring-2 focus:ring-offset-2
      transition-all duration-150
      disabled:opacity-50 disabled:cursor-not-allowed
      active:scale-95
    `;

    const variants = {
      primary: 'bg-[var(--accent-color-600)] text-white hover:bg-[var(--accent-color-700)] focus:ring-[var(--accent-color-500)]',
      secondary: 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 focus:ring-gray-400',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      ghost: 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-gray-400',
    };

    const sizes = {
      sm: 'px-3 py-2 md:px-2.5 md:py-1.5 text-sm md:text-xs min-h-[40px] md:min-h-[36px]',
      md: 'px-4 py-3 md:py-2 text-base md:text-sm min-h-[48px] md:min-h-[44px]',
      lg: 'px-6 py-4 md:py-3 text-lg md:text-base min-h-[56px] md:min-h-[48px]',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          ${baseStyles}
          ${variants[variant]}
          ${sizes[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

FormButton.displayName = 'FormButton';
