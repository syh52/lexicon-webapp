import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * 加载状态和骨架屏组件
 * 提供一致的加载体验
 */

// 基础加载动画
const LoadingSpinner = ({ size = 'md', color = 'purple' }: {
  size?: 'sm' | 'md' | 'lg';
  color?: 'purple' | 'blue' | 'green' | 'gray';
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };
  
  const colorClasses = {
    purple: 'border-purple-500',
    blue: 'border-blue-500',
    green: 'border-green-500',
    gray: 'border-gray-500'
  };
  
  return (
    <div className={`${sizeClasses[size]} border-4 ${colorClasses[color]} border-t-transparent rounded-full animate-spin`} />
  );
};

// 脉冲加载动画
const PulseLoader = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };
  
  return (
    <div className="flex space-x-2">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className={`${sizeClasses[size]} bg-purple-500 rounded-full animate-pulse`}
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  );
};

// 波浪加载动画
const WaveLoader = ({ color = 'purple' }: { color?: 'purple' | 'blue' | 'green' }) => {
  const colorClasses = {
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500'
  };
  
  return (
    <div className="flex space-x-1">
      {[0, 1, 2, 3, 4].map(i => (
        <div
          key={i}
          className={`w-1 h-6 ${colorClasses[color]} rounded-full animate-pulse`}
          style={{
            animationDelay: `${i * 0.1}s`,
            animationDuration: '1.4s'
          }}
        />
      ))}
    </div>
  );
};

// 骨架屏组件
const SkeletonBox = ({ 
  width = 'w-full', 
  height = 'h-4', 
  rounded = 'rounded' 
}: {
  width?: string;
  height?: string;
  rounded?: string;
}) => (
  <div className={`${width} ${height} ${rounded} bg-gray-200 animate-pulse`} />
);

// 文本骨架屏
const SkeletonText = ({ 
  lines = 3, 
  spacing = 'space-y-2' 
}: {
  lines?: number;
  spacing?: string;
}) => (
  <div className={`${spacing}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonBox
        key={i}
        width={i === lines - 1 ? 'w-3/4' : 'w-full'}
        height="h-4"
        rounded="rounded"
      />
    ))}
  </div>
);

// 卡片骨架屏
const SkeletonCard = () => (
  <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
    <div className="flex items-center space-x-4">
      <SkeletonBox width="w-12" height="h-12" rounded="rounded-full" />
      <div className="flex-1">
        <SkeletonBox width="w-1/2" height="h-4" rounded="rounded" />
        <div className="mt-2">
          <SkeletonBox width="w-3/4" height="h-3" rounded="rounded" />
        </div>
      </div>
    </div>
    <div className="mt-4">
      <SkeletonText lines={2} />
    </div>
  </div>
);

// 单词卡片骨架屏
const SkeletonWordCard = () => (
  <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
    <div className="text-center">
      <SkeletonBox width="w-32" height="h-8" rounded="rounded" />
      <div className="mt-4">
        <SkeletonBox width="w-16" height="h-4" rounded="rounded" />
      </div>
      <div className="mt-6">
        <SkeletonBox width="w-full" height="h-4" rounded="rounded" />
        <div className="mt-2">
          <SkeletonBox width="w-5/6" height="h-4" rounded="rounded" />
        </div>
      </div>
    </div>
  </div>
);

// 列表骨架屏
const SkeletonList = ({ items = 5 }: { items?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg animate-pulse">
        <SkeletonBox width="w-10" height="h-10" rounded="rounded-full" />
        <div className="flex-1">
          <SkeletonBox width="w-1/3" height="h-4" rounded="rounded" />
          <div className="mt-2">
            <SkeletonBox width="w-2/3" height="h-3" rounded="rounded" />
          </div>
        </div>
        <SkeletonBox width="w-16" height="h-8" rounded="rounded" />
      </div>
    ))}
  </div>
);

// 学习页面骨架屏
const SkeletonStudyPage = () => (
  <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
    <div className="w-full max-w-sm space-y-8">
      {/* 进度条骨架 */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <SkeletonBox width="w-16" height="h-4" rounded="rounded" />
          <SkeletonBox width="w-12" height="h-4" rounded="rounded" />
        </div>
        <SkeletonBox width="w-full" height="h-2" rounded="rounded-full" />
      </div>
      
      {/* 卡片骨架 */}
      <div className="bg-gray-800 rounded-3xl p-8 animate-pulse">
        <div className="text-center space-y-4">
          <SkeletonBox width="w-48" height="h-12" rounded="rounded" />
          <SkeletonBox width="w-12" height="h-12" rounded="rounded-full" />
          <div className="space-y-2">
            <SkeletonBox width="w-full" height="h-4" rounded="rounded" />
            <SkeletonBox width="w-5/6" height="h-4" rounded="rounded" />
          </div>
        </div>
      </div>
      
      {/* 按钮骨架 */}
      <div className="space-y-4">
        <SkeletonBox width="w-full" height="h-12" rounded="rounded-2xl" />
        <SkeletonBox width="w-full" height="h-12" rounded="rounded-2xl" />
      </div>
    </div>
  </div>
);

// 词书列表骨架屏
const SkeletonWordbookList = ({ items = 6 }: { items?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <SkeletonBox width="w-32" height="h-6" rounded="rounded" />
            <SkeletonBox width="w-16" height="h-6" rounded="rounded-full" />
          </div>
          <SkeletonText lines={2} />
          <div className="flex items-center justify-between">
            <SkeletonBox width="w-20" height="h-4" rounded="rounded" />
            <SkeletonBox width="w-24" height="h-4" rounded="rounded" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// 统计页面骨架屏
const SkeletonStatsPage = () => (
  <div className="space-y-6">
    {/* 概览卡片 */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
          <div className="space-y-2">
            <SkeletonBox width="w-full" height="h-8" rounded="rounded" />
            <SkeletonBox width="w-3/4" height="h-4" rounded="rounded" />
          </div>
        </div>
      ))}
    </div>
    
    {/* 图表骨架 */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <SkeletonBox width="w-1/3" height="h-6" rounded="rounded" />
        <div className="mt-4">
          <SkeletonBox width="w-full" height="h-64" rounded="rounded" />
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <SkeletonBox width="w-1/3" height="h-6" rounded="rounded" />
        <div className="mt-4">
          <SkeletonBox width="w-full" height="h-64" rounded="rounded" />
        </div>
      </div>
    </div>
  </div>
);

// 全屏加载组件
const FullScreenLoader = ({ 
  text = '加载中...', 
  subText = '请稍候' 
}: {
  text?: string;
  subText?: string;
}) => (
  <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-8 shadow-lg text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        <LoadingSpinner size="lg" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{text}</h3>
          <p className="text-sm text-gray-600">{subText}</p>
        </div>
      </motion.div>
    </div>
  </div>
);

// 页面级加载组件
const PageLoader = ({ 
  text = '加载中...',
  showProgress = false,
  progress = 0
}: {
  text?: string;
  showProgress?: boolean;
  progress?: number;
}) => {
  const [dots, setDots] = useState('');
  
  // 动态显示加载点
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center space-y-6 max-w-sm mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="flex justify-center">
            <div className="relative">
              <WaveLoader />
              {/* 添加脉冲效果 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-purple-500/20 rounded-full animate-ping"></div>
              </div>
            </div>
          </div>
          
          <div className="text-white">
            <h2 className="text-xl font-semibold mb-2">
              {text}
              <span className="text-purple-400 inline-block w-8 text-left">{dots}</span>
            </h2>
            
            {showProgress && (
              <div className="w-64 bg-gray-800 rounded-full h-2 mx-auto">
                <motion.div
                  className="bg-purple-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            )}
            
            {/* 添加提示信息 */}
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-500">
                首次加载可能需要几秒钟
              </p>
              
              {/* 超过10秒显示额外提示 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 10, duration: 0.3 }}
                className="text-xs text-gray-600"
              >
                <p>加载时间较长？可能是网络较慢</p>
                <p>您也可以尝试刷新页面</p>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// 内联加载组件
const InlineLoader = ({ 
  text = '加载中...',
  size = 'md' 
}: {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}) => (
  <div className="flex items-center justify-center space-x-3 p-4">
    <LoadingSpinner size={size} />
    <span className="text-gray-600">{text}</span>
  </div>
);

// 按钮加载组件  
const ButtonLoader = ({ 
  size = 'md',
  variant = 'primary' 
}: {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary';
}) => {
  const sizeClasses = {
    sm: 'h-8 px-3',
    md: 'h-10 px-4', 
    lg: 'h-12 px-6'
  };

  const variantClasses = {
    primary: 'bg-purple-600',
    secondary: 'bg-gray-800'
  };

  return (
    <div className={`inline-flex items-center justify-center rounded-lg animate-pulse ${sizeClasses[size]} ${variantClasses[variant]}`}>
      <LoadingSpinner size="sm" color="gray" />
    </div>
  );
};

// 组件级加载器
const ComponentLoader = ({ 
  height = 'h-32',
  text = '组件加载中...'
}: {
  height?: string;
  text?: string;
}) => (
  <div className={`flex items-center justify-center ${height} bg-gray-800/50 rounded-lg`}>
    <div className="text-center space-y-3">
      <PulseLoader />
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  </div>
);

// 导出所有组件
export {
  LoadingSpinner,
  PulseLoader,
  WaveLoader,
  SkeletonBox,
  SkeletonText,
  SkeletonCard,
  SkeletonWordCard,
  SkeletonList,
  SkeletonStudyPage,
  SkeletonWordbookList,
  SkeletonStatsPage,
  FullScreenLoader,
  PageLoader,
  InlineLoader,
  ButtonLoader,
  ComponentLoader
};

// 默认导出
export default {
  LoadingSpinner,
  PulseLoader,
  WaveLoader,
  SkeletonBox,
  SkeletonText,
  SkeletonCard,
  SkeletonWordCard,
  SkeletonList,
  SkeletonStudyPage,
  SkeletonWordbookList,
  SkeletonStatsPage,
  FullScreenLoader,
  PageLoader,
  InlineLoader,
  ButtonLoader,
  ComponentLoader
};