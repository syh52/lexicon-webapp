import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  enhanced?: boolean; // 是否启用波纹效果
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
      enhanced = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses = [
      'inline-flex items-center justify-center gap-2',
      'font-medium rounded-2xl transition-all duration-200',
      'modern-focus',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'hover:scale-105 active:scale-95',
      'relative z-10'
    ];

    const variants = {
      primary: [
        'gradient-primary text-white shadow-lg',
        'hover:shadow-glow'
      ],
      secondary: [
        'glass-card text-gray-300 hover:bg-white/20',
        'border border-white/20 hover:border-white/30'
      ],
      ghost: [
        'text-gray-400 hover:text-white hover:bg-white/10',
        'backdrop-blur-sm'
      ],
      danger: [
        'bg-red-600 text-white hover:bg-red-700 shadow-lg',
        'hover:shadow-red-500/30'
      ],
      outline: [
        'border border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white',
        'backdrop-blur-sm hover:shadow-glow'
      ],
      glass: [
        'glass-card-strong text-white border border-white/20',
        'hover:bg-white/20 hover:border-white/30 shadow-lg'
      ]
    };

    const sizes = {
      sm: 'px-4 py-2 text-sm h-9',
      md: 'px-6 py-3 text-sm h-11',
      lg: 'px-8 py-3.5 text-base h-12'
    };

    const classes = cn(
      baseClasses,
      variants[variant],
      sizes[size],
      {
        'w-full': fullWidth,
        'cursor-not-allowed': loading || disabled,
        'btn-enhanced': enhanced,
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

export { Button };
export default Button;