import React, { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated' | 'glass' | 'glass-strong';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  perspective?: boolean; // 是否启用3D透视效果
  enhanced?: boolean; // 是否启用增强交互效果
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'glass',
      padding = 'md',
      hover = false,
      perspective = false,
      enhanced = false,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses = [
      'rounded-2xl transition-all duration-200',
      'relative z-10'
    ];

    const variants = {
      default: [
        'bg-gray-800/50 border border-gray-700/50'
      ],
      outlined: [
        'bg-transparent border-2 border-gray-700 hover:border-gray-600'
      ],
      elevated: [
        'bg-gray-800 shadow-lg shadow-gray-900/20'
      ],
      glass: [
        'glass-card'
      ],
      'glass-strong': [
        'glass-card-strong'
      ]
    };

    const paddings = {
      none: '',
      sm: 'p-3',
      md: 'p-4 sm:p-6',
      lg: 'p-6 sm:p-8',
      xl: 'p-8 sm:p-10 md:p-12'
    };

    const hoverClasses = hover ? [
      'hover:scale-105',
      'hover:bg-white/[0.12]',
      'cursor-pointer'
    ] : [];

    const perspectiveClasses = perspective ? [
      'perspective-element'
    ] : [];

    const enhancedClasses = enhanced ? [
      'btn-enhanced'
    ] : [];

    const classes = cn(
      baseClasses,
      variants[variant],
      paddings[padding],
      hoverClasses,
      perspectiveClasses,
      enhancedClasses,
      className
    );

    return (
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card子组件
export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 pb-3', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-lg font-semibold text-white', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-gray-400', className)}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center pt-3', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card };
export default Card;