import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses = [
      'inline-flex items-center justify-center gap-2',
      'font-medium rounded-lg transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'active:scale-[0.98]'
    ];

    const variants = {
      primary: [
        'bg-purple-600 text-white hover:bg-purple-700',
        'focus:ring-purple-500',
        'disabled:bg-purple-800'
      ],
      secondary: [
        'bg-gray-800 text-gray-300 hover:bg-gray-700',
        'border border-gray-700 hover:border-gray-600',
        'focus:ring-gray-500'
      ],
      ghost: [
        'text-gray-400 hover:text-white hover:bg-gray-800/50',
        'focus:ring-gray-500'
      ],
      danger: [
        'bg-red-600 text-white hover:bg-red-700',
        'focus:ring-red-500',
        'disabled:bg-red-800'
      ],
      outline: [
        'border border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white',
        'focus:ring-purple-500'
      ]
    };

    const sizes = {
      sm: 'px-3 py-2 text-sm h-8',
      md: 'px-4 py-2.5 text-sm h-10',
      lg: 'px-6 py-3 text-base h-12'
    };

    const classes = cn(
      baseClasses,
      variants[variant],
      sizes[size],
      {
        'w-full': fullWidth,
        'cursor-not-allowed': loading || disabled,
      },
      className
    );

    return (
      <button
        ref={ref}
        className={classes}
        disabled={loading || disabled}
        {...props}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>加载中...</span>
          </>
        ) : (
          <>
            {leftIcon && leftIcon}
            {children}
            {rightIcon && rightIcon}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;