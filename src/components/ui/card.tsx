import React from 'react';
import { clsx } from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glass?: boolean;
}

export function Card({ children, glass = false, className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-lg border p-6',
        glass 
          ? 'bg-gray-900/50 border-gray-700/50 backdrop-blur-sm' 
          : 'bg-gray-900 border-gray-800',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('flex flex-col space-y-1.5 p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={clsx('text-lg font-semibold leading-none tracking-tight text-white', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('p-6 pt-0', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('flex items-center p-6 pt-0', className)} {...props}>
      {children}
    </div>
  );
}