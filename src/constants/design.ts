/**
 * Lexicon UI 设计系统 - 背景颜色规范
 * 避免重复设置，确保视觉一致性
 */

// 基础背景色（全局唯一）
export const BACKGROUNDS = {
  // 应用主背景 - 只在AppLayout中使用
  PRIMARY: 'bg-gray-900',
  
  // 加载/错误状态背景 - 用于全屏状态页面
  FULLSCREEN: 'min-h-screen bg-gray-900',
  
  // 透明卡片背景
  CARD: 'bg-white/5',
  CARD_STRONG: 'bg-white/10',
  
  // 半透明覆盖层
  OVERLAY: 'bg-gray-900/80',
  OVERLAY_STRONG: 'bg-gray-900/95',
} as const;

// 装饰性渐变（用于视觉增强）
export const GRADIENTS = {
  // 微妙的装饰渐变
  SUBTLE: 'bg-gradient-to-br from-purple-500/3 to-blue-500/3',
  
  // 按钮和交互元素
  PRIMARY_BUTTON: 'bg-gradient-to-r from-purple-500 to-blue-500',
  PRIMARY_BUTTON_HOVER: 'hover:from-purple-600 hover:to-blue-600',
  
  // 特殊页面装饰（谨慎使用）
  HERO: 'bg-gradient-to-br from-purple-500/20 to-blue-500/20',
} as const;

// 边框样式
export const BORDERS = {
  CARD: 'border border-white/10',
  CARD_STRONG: 'border border-white/20',
  INPUT: 'border border-white/10 focus:border-purple-500/50',
} as const;

// 文本颜色
export const TEXT_COLORS = {
  PRIMARY: 'text-white',
  SECONDARY: 'text-white/80',
  MUTED: 'text-white/60',
  PLACEHOLDER: 'text-gray-500',
} as const;

/**
 * 使用规范：
 * 
 * 1. 全局背景：只在 AppLayout 中使用 BACKGROUNDS.PRIMARY
 * 2. 页面组件：不设置背景，继承全局样式
 * 3. 卡片组件：使用 BACKGROUNDS.CARD 系列
 * 4. 装饰效果：谨慎使用 GRADIENTS 系列
 * 5. 特殊页面：可使用 BACKGROUNDS.FULLSCREEN（如加载页）
 */