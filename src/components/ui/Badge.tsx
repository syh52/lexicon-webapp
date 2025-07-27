import React, { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  count?: number;
  maxCount?: number;
  showZero?: boolean;
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      dot = false,
      count,
      maxCount = 99,
      showZero = false,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses = [
      'inline-flex items-center justify-center',
      'font-medium rounded-full transition-all duration-200',
      'border-0'
    ];

    const variants = {
      default: 'bg-purple-600 text-white',
      secondary: 'bg-gray-700 text-gray-300',
      success: 'bg-green-600 text-white',
      warning: 'bg-yellow-600 text-black',
      error: 'bg-red-600 text-white',
      info: 'bg-blue-600 text-white'
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-xs min-h-[16px] min-w-[16px]',
      md: 'px-2.5 py-1 text-xs min-h-[20px] min-w-[20px]',
      lg: 'px-3 py-1.5 text-sm min-h-[24px] min-w-[24px]'
    };

    const dotSizes = {
      sm: 'w-2 h-2',
      md: 'w-2.5 h-2.5',
      lg: 'w-3 h-3'
    };

    // 处理数字显示
    const displayCount = count !== undefined && count > maxCount ? `${maxCount}+` : count;
    const shouldShow = count !== undefined && (count > 0 || showZero);

    if (dot) {
      return (
        <div
          ref={ref}
          className={cn(
            'rounded-full',
            dotSizes[size],
            variants[variant],
            className
          )}
          {...props}
        />
      );
    }

    if (count !== undefined) {
      if (!shouldShow) return null;
      
      return (
        <div
          ref={ref}
          className={cn(
            baseClasses,
            variants[variant],
            sizes[size],
            className
          )}
          {...props}
        >
          {displayCount}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Badge.displayName = 'Badge';

// 带徽章的容器组件
export const BadgeContainer = forwardRef<HTMLDivElement, {
  children: React.ReactNode;
  badge?: React.ReactNode;
  badgeProps?: BadgeProps;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  offset?: { x?: number; y?: number };
  className?: string;
}>(
  (
    {
      children,
      badge,
      badgeProps,
      position = 'top-right',
      offset = {},
      className,
      ...props
    },
    ref
  ) => {
    const positionClasses = {
      'top-right': 'top-0 right-0 translate-x-1/2 -translate-y-1/2',
      'top-left': 'top-0 left-0 -translate-x-1/2 -translate-y-1/2',
      'bottom-right': 'bottom-0 right-0 translate-x-1/2 translate-y-1/2',
      'bottom-left': 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2'
    };

    const offsetStyles = {
      transform: `translate(${offset.x || 0}px, ${offset.y || 0}px)`
    };

    return (
      <div
        ref={ref}
        className={cn('relative inline-flex', className)}
        {...props}
      >
        {children}
        {badge && (
          <div
            className={cn(
              'absolute z-10',
              positionClasses[position]
            )}
            style={offset.x !== undefined || offset.y !== undefined ? offsetStyles : undefined}
          >
            {React.isValidElement(badge) ? badge : <Badge {...badgeProps}>{badge}</Badge>}
          </div>
        )}
      </div>
    );
  }
);

BadgeContainer.displayName = 'BadgeContainer';

export { Badge };
export default Badge;