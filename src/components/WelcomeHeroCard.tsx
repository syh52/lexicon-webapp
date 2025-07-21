import React, { ReactNode, useMemo, useEffect, useState } from 'react';
import { ANIMATION_DELAYS, STYLES, DEFAULT_VALUES, type AnimationDelay } from './WelcomeHeroCard.constants';

export interface WelcomeHeroCardProps {
  /** 主标题上方的小标题文本 */
  subtitle?: string;
  /** 主标题文本 */
  title: string;
  /** 副标题或说明文本 */
  description?: string;
  /** 按钮文本 */
  buttonText?: string;
  /** 按钮点击事件 */
  onButtonClick?: () => void;
  /** 是否显示按钮 */
  showButton?: boolean;
  /** 自定义按钮内容 */
  customButton?: ReactNode;
  /** 额外的CSS类名 */
  className?: string;
  /** 是否启用动画效果 */
  enableAnimation?: boolean;
  /** 动画延迟时间（预定义选项） */
  animationDelay?: AnimationDelay;
}

/**
 * WelcomeHeroCard - 欢迎页面主要卡片组件
 * 
 * 这是一个采用Glass Morphism设计风格的现代化欢迎卡片组件，
 * 具有以下设计特点：
 * 
 * ## 设计规范
 * 
 * ### 字体系统
 * - 主体字体：'Noto Sans SC', 'Inter', 'Microsoft YaHei', 'PingFang SC' 等系统字体栈
 * - 字体渲染：启用 -webkit-font-smoothing: antialiased 抗锯齿
 * - 小标题：text-xs (12px) 到 text-sm (14px)，字重 font-medium (500)
 * - 主标题：text-lg (18px) 到 text-2xl (24px)，字重 font-semibold (600)
 * - 副标题：text-xs (12px) 到 text-sm (14px)，字重 font-normal (400)
 * 
 * ### 颜色系统
 * - 小标题：text-purple-400 (#c084fc)
 * - 主标题：text-white (#ffffff)
 * - 副标题：text-gray-400 (#9ca3af)
 * - 背景：glass-card (bg-white/10 + backdrop-blur-xl)
 * - 边框：border-white/20
 * 
 * ### 间距系统
 * - 外边距：响应式 p-6 (24px) / sm:p-8 (32px) / md:p-10 (40px)
 * - 内部间距：
 *   - 小标题到主标题：mb-3 (12px) / sm:mb-4 (16px)
 *   - 主标题到副标题：mb-4 (16px) / sm:mb-6 (24px)
 *   - 副标题到按钮：mb-6 (24px) / sm:mb-8 (32px)
 * 
 * ### 圆角系统
 * - 卡片圆角：rounded-3xl (24px)
 * - 按钮圆角：rounded-2xl (16px)
 * 
 * ### 动画效果
 * - 进入动画：animate-blur-in (0.4s ease-out)
 * - 延迟动画：animate-delay-200 (0.2s)
 * - 悬停效果：hover:scale-105 (1.05倍缩放)
 * - 点击效果：active:scale-95 (0.95倍缩放)
 * 
 * ### 响应式断点
 * - 基础：无前缀，适用于所有尺寸
 * - sm: 640px 及以上
 * - md: 768px 及以上
 * 
 * ### 视觉层次
 * - 背景模糊：backdrop-blur-xl (24px)
 * - 透明度：bg-white/10 (10% 不透明度)
 * - 渐变背景：from-purple-500/20 to-blue-500/20
 * - 阴影：shadow-lg
 */
function WelcomeHeroCard({
  subtitle = DEFAULT_VALUES.subtitle,
  title,
  description,
  buttonText = DEFAULT_VALUES.buttonText,
  onButtonClick,
  showButton = DEFAULT_VALUES.showButton,
  customButton,
  className = DEFAULT_VALUES.className,
  enableAnimation = DEFAULT_VALUES.enableAnimation,
  animationDelay = DEFAULT_VALUES.animationDelay
}: WelcomeHeroCardProps) {
  // 检测用户是否偏好减少动画
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // 使用 useMemo 缓存动画类名计算
  const animationClasses = useMemo(() => {
    const shouldAnimate = enableAnimation && !prefersReducedMotion;
    if (!shouldAnimate) return '';
    
    // 添加安全检查
    if (!STYLES.animation?.base) {
      console.warn('STYLES.animation.base 未定义');
      return '';
    }
    
    return `${STYLES.animation.base} ${ANIMATION_DELAYS[animationDelay]}`;
  }, [enableAnimation, prefersReducedMotion, animationDelay]);

  // 使用 useMemo 缓存完整的容器类名
  const containerClasses = useMemo(() => {
    return `${STYLES.container} ${animationClasses} ${className}`.trim();
  }, [animationClasses, className]);

  return (
    <div className={containerClasses}>
      {/* 背景模糊渐变层 */}
      <div className={STYLES.backgroundLayer} aria-hidden="true"></div>
      
      {/* 主要内容卡片 */}
      <div className={STYLES.cardContainer}>
        <div className={STYLES.contentCenter}>
          {/* 小标题 */}
          {subtitle && (
            <div className={STYLES.subtitle} role="banner">
              {subtitle}
            </div>
          )}
          
          {/* 主标题 - 使用语义化标签 */}
          <h1 className={STYLES.title}>
            {title}
          </h1>
          
          {/* 副标题/描述 */}
          {description && (
            <p className={STYLES.description}>
              {description}
            </p>
          )}
          
          {/* 按钮区域 */}
          {showButton && (
            <div>
              {customButton || (
                <button 
                  type="button"
                  onClick={onButtonClick}
                  className={STYLES.button}
                  aria-label={`${buttonText} - 主要操作按钮`}
                >
                  {buttonText}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 使用 React.memo 包装组件以提升性能
export default React.memo(WelcomeHeroCard);

/**
 * 使用示例：
 * 
 * ```tsx
 * <WelcomeHeroCard
 *   subtitle="欢迎来到LEXICON"
 *   title="You are the salt of the earth"
 *   description="你们是世上的盐 —— 《马太福音》5:13"
 *   buttonText="开始学习之旅"
 *   onButtonClick={() => navigate('/login')}
 *   enableAnimation={true}
 *   animationDelay={200}
 * />
 * ```
 */ 