import React from 'react';
import { clsx } from 'clsx';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function Progress({ value, max = 100, size = 'md', className, ...props }: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const heights = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  return (
    <div
      className={clsx(
        'w-full bg-gray-800 rounded-full overflow-hidden',
        heights[size],
        className
      )}
      {...props}
    >
      <div
        className="h-full bg-blue-600 transition-all duration-300 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}