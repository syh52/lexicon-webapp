import React, { Suspense, ComponentType } from 'react';
import { PageLoader } from '../components/ui/LoadingStates';

/**
 * 懒加载工具
 * 提供页面级别的代码分割和懒加载
 */

interface LazyLoadOptions {
  fallback?: React.ComponentType;
  errorBoundary?: React.ComponentType<{ error: Error; reset: () => void }>;
  delay?: number;
  timeout?: number;
}

/**
 * 创建懒加载组件
 */
export const createLazyComponent = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): React.ComponentType<React.ComponentProps<T>> => {
  const LazyComponent = React.lazy(importFn);
  
  const {
    fallback = PageLoader,
    delay = 300,
    timeout = 10000
  } = options;

  return React.memo((props: React.ComponentProps<T>) => {
    const [showFallback, setShowFallback] = React.useState(false);
    const [hasError, setHasError] = React.useState(false);
    const [error, setError] = React.useState<Error | null>(null);

    // 延迟显示loading
    React.useEffect(() => {
      const timer = setTimeout(() => {
        setShowFallback(true);
      }, delay);

      return () => clearTimeout(timer);
    }, [delay]);

    // 超时处理
    React.useEffect(() => {
      const timer = setTimeout(() => {
        setHasError(true);
        setError(new Error('组件加载超时'));
      }, timeout);

      return () => clearTimeout(timer);
    }, [timeout]);

    // 错误处理
    const handleError = React.useCallback((error: Error) => {
      setHasError(true);
      setError(error);
    }, []);

    const handleReset = React.useCallback(() => {
      setHasError(false);
      setError(null);
      setShowFallback(false);
    }, []);

    if (hasError && error) {
      if (options.errorBoundary) {
        return React.createElement(options.errorBoundary, { error, reset: handleReset });
      }
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="text-center text-white">
            <h2 className="text-2xl font-semibold mb-4">加载失败</h2>
            <p className="text-gray-400 mb-6">{error.message}</p>
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition"
            >
              重试
            </button>
          </div>
        </div>
      );
    }

    return (
      <Suspense fallback={showFallback ? React.createElement(fallback) : null}>
        <LazyComponent {...props} />
      </Suspense>
    );
  });
};

/**
 * 预加载组件
 */
export const preloadComponent = (importFn: () => Promise<any>) => {
  const componentPromise = importFn();
  return componentPromise;
};

/**
 * 懒加载路由组件
 */
export const lazyRoutes = {
  HomePage: createLazyComponent(
    () => import('../pages/HomePage'),
    { 
      fallback: () => <PageLoader text="加载首页..." />,
      delay: 200
    }
  ),
  
  StudyPage: createLazyComponent(
    () => import('../pages/StudyPage'),
    { 
      fallback: () => <PageLoader text="准备学习环境..." />,
      delay: 100
    }
  ),
  
  WordbooksPage: createLazyComponent(
    () => import('../pages/WordbooksPage'),
    { 
      fallback: () => <PageLoader text="加载词书..." />,
      delay: 200
    }
  ),
  
  StatsPage: createLazyComponent(
    () => import('../pages/StatsPage'),
    { 
      fallback: () => <PageLoader text="加载统计数据..." />,
      delay: 300
    }
  ),
  
  SettingsPage: createLazyComponent(
    () => import('../pages/SettingsPage'),
    { 
      fallback: () => <PageLoader text="加载设置..." />,
      delay: 200
    }
  ),
  
  ProfilePage: createLazyComponent(
    () => import('../pages/ProfilePage'),
    { 
      fallback: () => <PageLoader text="加载个人资料..." />,
      delay: 200
    }
  ),
  
  UploadPage: createLazyComponent(
    () => import('../pages/UploadPage'),
    { 
      fallback: () => <PageLoader text="加载上传页面..." />,
      delay: 250
    }
  ),
  
  AuthPage: createLazyComponent(
    () => import('../pages/AuthPage'),
    { 
      fallback: () => <PageLoader text="加载认证页面..." />,
      delay: 150
    }
  )
};

/**
 * 懒加载组件
 */
export const lazyComponents = {
  StudyCard: createLazyComponent(
    () => import('../components/study/StudyCard'),
    { delay: 100 }
  ),
  
  StudyProgress: createLazyComponent(
    () => import('../components/study/StudyProgress'),
    { delay: 150 }
  ),
  
  StudyStats: createLazyComponent(
    () => import('../components/study/StudyStats'),
    { delay: 200 }
  ),
  
  DataPreview: createLazyComponent(
    () => import('../components/upload/DataPreview'),
    { delay: 200 }
  ),
  
  FileUploadZone: createLazyComponent(
    () => import('../components/upload/FileUploadZone'),
    { delay: 150 }
  ),
  
  FormatGuide: createLazyComponent(
    () => import('../components/upload/FormatGuide'),
    { delay: 250 }
  ),
  
  UploadProgress: createLazyComponent(
    () => import('../components/upload/UploadProgress'),
    { delay: 100 }
  )
};

/**
 * 路由预加载器
 */
export class RoutePreloader {
  private static preloadedRoutes = new Set<string>();
  
  static preload(routeName: keyof typeof lazyRoutes) {
    if (this.preloadedRoutes.has(routeName)) return;
    
    this.preloadedRoutes.add(routeName);
    
    // 预加载路由组件
    switch (routeName) {
      case 'HomePage':
        preloadComponent(() => import('../pages/HomePage'));
        break;
      case 'StudyPage':
        preloadComponent(() => import('../pages/StudyPage'));
        break;
      case 'WordbooksPage':
        preloadComponent(() => import('../pages/WordbooksPage'));
        break;
      case 'StatsPage':
        preloadComponent(() => import('../pages/StatsPage'));
        break;
      case 'SettingsPage':
        preloadComponent(() => import('../pages/SettingsPage'));
        break;
      case 'ProfilePage':
        preloadComponent(() => import('../pages/ProfilePage'));
        break;
      case 'UploadPage':
        preloadComponent(() => import('../pages/UploadPage'));
        break;
      case 'AuthPage':
        preloadComponent(() => import('../pages/AuthPage'));
        break;
    }
  }
  
  static preloadAll() {
    Object.keys(lazyRoutes).forEach(routeName => {
      this.preload(routeName as keyof typeof lazyRoutes);
    });
  }
  
  static preloadUserFlowRoutes() {
    // 预加载用户常用路径
    this.preload('HomePage');
    this.preload('WordbooksPage');
    this.preload('StudyPage');
  }
}

/**
 * 智能预加载Hook
 */
export const useSmartPreload = () => {
  const [hasPreloaded, setHasPreloaded] = React.useState(false);
  
  React.useEffect(() => {
    if (hasPreloaded) return;
    
    // 延迟预加载，避免阻塞主要内容
    const timer = setTimeout(() => {
      RoutePreloader.preloadUserFlowRoutes();
      setHasPreloaded(true);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [hasPreloaded]);
  
  // 鼠标悬停预加载
  const handleMouseEnter = React.useCallback((routeName: keyof typeof lazyRoutes) => {
    RoutePreloader.preload(routeName);
  }, []);
  
  return { handleMouseEnter };
};

/**
 * 资源预加载器
 */
export const ResourcePreloader = {
  preloadImage: (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = src;
    });
  },
  
  preloadFont: (fontFamily: string, fontWeight: string = 'normal'): Promise<void> => {
    return new Promise((resolve) => {
      const font = new FontFace(fontFamily, `url(/fonts/${fontFamily}.woff2)`, {
        weight: fontWeight
      });
      
      font.load().then(() => {
        document.fonts.add(font);
        resolve();
      }).catch(() => {
        resolve(); // 字体加载失败时继续
      });
    });
  },
  
  preloadScript: (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
};

/**
 * 预加载管理器
 */
export const PreloadManager = {
  init: async () => {
    try {
      // 预加载字体
      await ResourcePreloader.preloadFont('Inter');
      
      // 预加载关键图片
      const criticalImages = [
        '/logo.png',
        '/icons/study.svg',
        '/icons/wordbook.svg'
      ];
      
      await Promise.all(
        criticalImages.map(src => 
          ResourcePreloader.preloadImage(src).catch(() => {})
        )
      );
      
      // 延迟预加载次要资源
      setTimeout(() => {
        RoutePreloader.preloadUserFlowRoutes();
      }, 1000);
      
    } catch (error) {
      console.warn('预加载失败:', error);
    }
  }
};

// 导出默认配置
export default {
  lazyRoutes,
  lazyComponents,
  RoutePreloader,
  PreloadManager
};