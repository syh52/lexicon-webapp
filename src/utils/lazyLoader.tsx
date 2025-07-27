import React, { Suspense, ComponentType } from 'react';
import { PageLoader } from '../components/ui/LoadingStates';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { 
  ComponentLoadTracker, 
  NetworkDetector,
  getAdaptiveTimeout,
  getLoadingMessage 
} from './componentLoader';

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
  options: LazyLoadOptions = {},
  componentName?: string
): React.ComponentType<React.ComponentProps<T>> => {
  const LazyComponent = React.lazy(() => {
    const name = componentName || 'UnknownComponent';
    ComponentLoadTracker.startLoading(name);
    
    return importFn()
      .then(module => {
        ComponentLoadTracker.markLoaded(name);
        return module;
      })
      .catch(error => {
        ComponentLoadTracker.markError(name);
        throw error;
      });
  });
  
  const {
    fallback = PageLoader,
    delay = 150,
    timeout: optionsTimeout
  } = options;
  
  // 使用自适应超时时间
  const timeout = optionsTimeout || getAdaptiveTimeout(componentName || 'Unknown');

  return React.memo((props: React.ComponentProps<T>) => {
    const [showFallback, setShowFallback] = React.useState(false);
    const [hasError, setHasError] = React.useState(false);
    const [error, setError] = React.useState<Error | null>(null);
    const [componentLoaded, setComponentLoaded] = React.useState(false);
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const mountedRef = React.useRef(true);

    // 组件卸载时清理
    React.useEffect(() => {
      return () => {
        mountedRef.current = false;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    // 延迟显示loading
    React.useEffect(() => {
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          setShowFallback(true);
        }
      }, delay);

      return () => clearTimeout(timer);
    }, [delay]);

    // 智能超时处理 - 创建一个延迟的超时，给组件足够时间加载
    React.useEffect(() => {
      if (!componentLoaded && !hasError) {
        timeoutRef.current = setTimeout(() => {
          if (mountedRef.current && !componentLoaded && !hasError) {
            console.warn('Component loading timeout after', timeout, 'ms');
            setHasError(true);
            setError(new Error('网络连接缓慢，组件加载超时。请检查网络连接后重试。'));
          }
        }, timeout);
      }

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    }, [timeout, componentLoaded, hasError]);

    // 智能Suspense包装器
    const SuspenseWrapper = React.useMemo(() => {
      return ({ children }: { children: React.ReactNode }) => {
        const [loadTime, setLoadTime] = React.useState(0);
        
        // 跟踪加载时间
        React.useEffect(() => {
          if (!componentLoaded) {
            const interval = setInterval(() => {
              setLoadTime(prev => prev + 100);
            }, 100);
            
            return () => clearInterval(interval);
          }
        }, [componentLoaded]);

        return (
          <Suspense 
            fallback={
              <React.Fragment>
                {(() => {
                  // 动态获取加载消息
                  const name = componentName || 'Unknown';
                  const dynamicText = getLoadingMessage(name, loadTime);
                  
                  // 使用动态文本创建加载器
                  const DynamicLoader = () => React.createElement(fallback, { text: dynamicText });
                  
                  return showFallback ? <DynamicLoader /> : null;
                })()}
              </React.Fragment>
            }
          >
            <React.Fragment>
              {React.Children.map(children, (child, index) => {
                if (index === 0 && !componentLoaded) {
                  // 标记组件已加载
                  setTimeout(() => {
                    if (mountedRef.current) {
                      setComponentLoaded(true);
                      if (timeoutRef.current) {
                        clearTimeout(timeoutRef.current);
                        timeoutRef.current = null;
                      }
                    }
                  }, 0);
                }
                return child;
              })}
            </React.Fragment>
          </Suspense>
        );
      };
    }, [showFallback, fallback, componentLoaded, componentName]);

    const handleReset = React.useCallback(() => {
      setHasError(false);
      setError(null);
      setShowFallback(false);
      setComponentLoaded(false);
      
      // 清除现有超时
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // 强制重新加载页面来解决组件加载问题
      window.location.reload();
    }, []);

    if (hasError && error) {
      if (options.errorBoundary) {
        return React.createElement(options.errorBoundary, { error, reset: handleReset });
      }
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="text-center text-white max-w-md mx-auto p-6">
            <div className="mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold mb-2">加载失败</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">{error.message}</p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleReset}
                className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
              >
                刷新重试
              </button>
              <button
                onClick={() => window.history.back()}
                className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition-colors"
              >
                返回上页
              </button>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-800">
              <p className="text-xs text-gray-600">
                如果问题持续存在，请尝试清除浏览器缓存或联系技术支持
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <ErrorBoundary
        fallback={(error, resetErrorBoundary) => (
          <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="text-center text-white">
              <h2 className="text-2xl font-semibold mb-4">组件渲染失败</h2>
              <p className="text-gray-400 mb-6">
                {process.env.NODE_ENV === 'development' 
                  ? error.message 
                  : '组件在渲染过程中发生错误'}
              </p>
              <button
                onClick={resetErrorBoundary}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition"
              >
                重试
              </button>
            </div>
          </div>
        )}
        onError={(error) => {
          console.error('Lazy component error:', error);
          if (mountedRef.current) {
            setHasError(true);
            setError(error);
          }
        }}
      >
        <SuspenseWrapper>
          <LazyComponent {...props} />
        </SuspenseWrapper>
      </ErrorBoundary>
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
    () => import('../pages/HomePage.tsx'),
    { 
      fallback: () => <PageLoader text="加载首页" />,
      delay: 100
    },
    'HomePage'
  ),
  
  StudyPage: createLazyComponent(
    () => import('../pages/StudyPage'),
    { 
      fallback: () => <PageLoader text="准备学习环境" />,
      delay: 50
    },
    'StudyPage'
  ),
  
  WordbooksPage: createLazyComponent(
    () => import('../pages/WordbooksPage'),
    { 
      fallback: () => <PageLoader text="加载词书列表" />,
      delay: 100
    },
    'WordbooksPage'
  ),
  
  StatsPage: createLazyComponent(
    () => import('../pages/StatsPage'),
    { 
      fallback: () => <PageLoader text="加载统计数据" />,
      delay: 150
    },
    'StatsPage'
  ),
  
  
  ProfilePage: createLazyComponent(
    () => import('../pages/ProfilePage'),
    { 
      fallback: () => <PageLoader text="加载个人资料" />,
      delay: 100
    },
    'ProfilePage'
  ),
  
  UploadPage: createLazyComponent(
    () => import('../pages/UploadPage'),
    { 
      fallback: () => <PageLoader text="加载上传页面" />,
      delay: 150
    },
    'UploadPage'
  ),
  
  AuthPage: createLazyComponent(
    () => import('../pages/AuthPage'),
    { 
      fallback: () => <PageLoader text="加载登录页面" />,
      delay: 100
    },
    'AuthPage'
  ),

  NotFoundPage: createLazyComponent(
    () => import('../pages/NotFoundPage'),
    { 
      fallback: () => <PageLoader text="加载页面" />,
      delay: 50,
      timeout: 8000
    },
    'NotFoundPage'
  ),

  VoiceAssistantPage: createLazyComponent(
    () => import('../pages/VoiceAssistantPage'),
    { 
      fallback: () => <PageLoader text="加载语音助手" />,
      delay: 100
    },
    'VoiceAssistantPage'
  ),

  TestPage: createLazyComponent(
    () => import('../pages/TestPage'),
    { 
      fallback: () => <PageLoader text="加载测试页面" />,
      delay: 100
    },
    'TestPage'
  ),

  AdminPage: createLazyComponent(
    () => import('../pages/AdminPage'),
    { 
      fallback: () => <PageLoader text="加载管理面板" />,
      delay: 150
    },
    'AdminPage'
  ),

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