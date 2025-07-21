import React from 'react';
import { useNavigate } from 'react-router-dom';
import WelcomeHeroCard from './WelcomeHeroCard';
import { ArrowRight, Heart, Star } from 'lucide-react';

/**
 * WelcomeHeroCard 使用示例集合
 * 
 * 这个文件包含了各种不同场景下的使用示例，展示组件的灵活性和可定制性
 */

// 示例 1: 基础使用 (默认配置)
export function BasicExample() {
  const navigate = useNavigate();

  return (
    <WelcomeHeroCard
      title="欢迎来到 LEXICON"
      onButtonClick={() => navigate('/login')}
    />
  );
}

// 示例 2: 完整配置 (原始设计)
export function FullConfigExample() {
  const navigate = useNavigate();

  return (
    <WelcomeHeroCard
      subtitle="欢迎来到LEXICON"
      title="Ye are the salt of the earth: but if the salt have lost his savour, wherewith shall it be salted?"
      description="你们是世上的盐。盐若失了味，怎能叫它再咸呢？ —— 《马太福音》5:13"
      buttonText="开始学习之旅"
      onButtonClick={() => navigate('/login')}
      enableAnimation={true}
      animationDelay={200}
    />
  );
}

// 示例 3: 自定义按钮
export function CustomButtonExample() {
  const handleSpecialAction = () => {
    console.log('执行特殊操作');
  };

  return (
    <WelcomeHeroCard
      title="自定义按钮示例"
      description="这个示例展示了如何使用自定义按钮"
      customButton={
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
          <button 
            onClick={handleSpecialAction}
            className="flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-2xl font-medium hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <Heart className="w-5 h-5" />
            <span>喜欢</span>
          </button>
          <button 
            onClick={handleSpecialAction}
            className="flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-medium hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <Star className="w-5 h-5" />
            <span>收藏</span>
          </button>
        </div>
      }
    />
  );
}

// 示例 4: 无按钮版本
export function NoButtonExample() {
  return (
    <WelcomeHeroCard
      subtitle="纯展示卡片"
      title="这是一个没有按钮的卡片"
      description="适用于纯信息展示的场景"
      showButton={false}
    />
  );
}

// 示例 5: 禁用动画
export function NoAnimationExample() {
  return (
    <WelcomeHeroCard
      title="无动画版本"
      description="适用于性能敏感的场景"
      enableAnimation={false}
    />
  );
}

// 示例 6: 多语言支持
export function MultiLanguageExample() {
  const [language, setLanguage] = React.useState<'zh' | 'en'>('zh');

  const content = {
    zh: {
      subtitle: "欢迎来到LEXICON",
      title: "你们是世上的盐",
      description: "盐若失了味，怎能叫它再咸呢？ —— 《马太福音》5:13",
      buttonText: "开始学习之旅"
    },
    en: {
      subtitle: "Welcome to LEXICON",
      title: "You are the salt of the earth",
      description: "But if the salt loses its saltiness, how can it be made salty again? — Matthew 5:13",
      buttonText: "Start Your Journey"
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <button
          onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          切换语言 / Switch Language
        </button>
      </div>
      
      <WelcomeHeroCard
        subtitle={content[language].subtitle}
        title={content[language].title}
        description={content[language].description}
        buttonText={content[language].buttonText}
        onButtonClick={() => console.log('语言:', language)}
      />
    </div>
  );
}

// 示例 7: 响应式测试
export function ResponsiveTestExample() {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-white text-center">响应式测试</h2>
      <p className="text-gray-400 text-center">调整浏览器窗口大小查看效果</p>
      
      <WelcomeHeroCard
        subtitle="响应式设计"
        title="这个卡片会根据屏幕大小自动调整布局和字体大小"
        description="移动端 → 平板 → 桌面端的完美适配"
        buttonText="测试响应式"
        onButtonClick={() => {
          const width = window.innerWidth;
          const breakpoint = width < 640 ? '移动端' : width < 768 ? '小屏平板' : '桌面端';
          alert(`当前断点: ${breakpoint} (${width}px)`);
        }}
      />
    </div>
  );
}

export default {
  BasicExample,
  FullConfigExample,
  CustomButtonExample,
  NoButtonExample,
  NoAnimationExample,
  MultiLanguageExample,
  ResponsiveTestExample
};