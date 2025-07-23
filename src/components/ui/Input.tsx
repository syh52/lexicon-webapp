import React, { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'filled' | 'outline';
  inputSize?: 'sm' | 'md' | 'lg';
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  label?: string;
  helperText?: string;
  errorMessage?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant = 'default',
      inputSize = 'md',
      error = false,
      leftIcon,
      rightIcon,
      label,
      helperText,
      errorMessage,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const baseClasses = [
      'w-full rounded-lg transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900',
      'disabled:cursor-not-allowed disabled:opacity-50'
    ];

    const variants = {
      default: [
        'bg-gray-800 border border-gray-700',
        'text-white placeholder:text-gray-500',
        'hover:border-gray-600',
        error ? 'border-red-500 focus:ring-red-500' : 'focus:ring-purple-500 focus:border-purple-500'
      ],
      filled: [
        'bg-gray-800/80 border-0',
        'text-white placeholder:text-gray-500',
        error ? 'ring-1 ring-red-500 focus:ring-red-500' : 'focus:ring-purple-500',
        'focus:bg-gray-800'
      ],
      outline: [
        'bg-transparent border-2',
        'text-white placeholder:text-gray-500',
        error ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-purple-500 focus:border-purple-500'
      ]
    };

    const sizes = {
      sm: 'px-3 py-2 text-sm h-8',
      md: 'px-4 py-2.5 text-sm h-10',
      lg: 'px-4 py-3 text-base h-12'
    };

    const iconClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6'
    };

    const classes = cn(
      baseClasses,
      variants[variant],
      sizes[inputSize],
      {
        'pl-10': leftIcon && inputSize === 'sm',
        'pl-11': leftIcon && inputSize === 'md',
        'pl-12': leftIcon && inputSize === 'lg',
        'pr-10': rightIcon && inputSize === 'sm',
        'pr-11': rightIcon && inputSize === 'md',
        'pr-12': rightIcon && inputSize === 'lg',
      },
      className
    );

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className={cn(
              'absolute left-0 top-0 h-full flex items-center justify-center text-gray-500',
              {
                'w-8': inputSize === 'sm',
                'w-10': inputSize === 'md',
                'w-12': inputSize === 'lg',
              }
            )}>
              <span className={iconClasses[inputSize]}>
                {leftIcon}
              </span>
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={classes}
            disabled={disabled}
            {...props}
          />

          {rightIcon && (
            <div className={cn(
              'absolute right-0 top-0 h-full flex items-center justify-center text-gray-500',
              {
                'w-8': inputSize === 'sm',
                'w-10': inputSize === 'md',
                'w-12': inputSize === 'lg',
              }
            )}>
              <span className={iconClasses[inputSize]}>
                {rightIcon}
              </span>
            </div>
          )}
        </div>

        {(helperText || errorMessage) && (
          <div className="mt-1">
            {error && errorMessage ? (
              <p className="text-sm text-red-400">{errorMessage}</p>
            ) : helperText ? (
              <p className="text-sm text-gray-500">{helperText}</p>
            ) : null}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;