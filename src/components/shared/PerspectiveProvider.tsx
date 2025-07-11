import React from 'react';

interface PerspectiveProviderProps {
  children: React.ReactNode;
}

/**
 * 简化的透视效果提供者 - 移除复杂动画以避免交互问题
 */
export default function PerspectiveProvider({ children }: PerspectiveProviderProps) {
  return (
    <div className="perspective-container">
      <div className="perspective-element">
        {children}
      </div>
    </div>
  );
}