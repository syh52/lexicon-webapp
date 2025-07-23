/**
 * 智能组件加载器
 * 提供更精确的组件加载状态检测
 */

// 组件加载状态跟踪器
export class ComponentLoadTracker {
  private static loadingComponents = new Map<string, {
    startTime: number;
    status: 'loading' | 'loaded' | 'error';
    retryCount: number;
  }>();

  static startLoading(componentName: string) {
    this.loadingComponents.set(componentName, {
      startTime: Date.now(),
      status: 'loading',
      retryCount: 0
    });
  }

  static markLoaded(componentName: string) {
    const component = this.loadingComponents.get(componentName);
    if (component) {
      component.status = 'loaded';
      const loadTime = Date.now() - component.startTime;
      
      // 在开发环境记录加载时间
      if (process.env.NODE_ENV === 'development') {
        console.log(`Component ${componentName} loaded in ${loadTime}ms`);
      }

      // 清理记录（3秒后）
      setTimeout(() => {
        this.loadingComponents.delete(componentName);
      }, 3000);
    }
  }

  static markError(componentName: string) {
    const component = this.loadingComponents.get(componentName);
    if (component) {
      component.status = 'error';
      component.retryCount++;
    }
  }

  static getStatus(componentName: string) {
    return this.loadingComponents.get(componentName);
  }

  static isLoading(componentName: string): boolean {
    const component = this.loadingComponents.get(componentName);
    return component?.status === 'loading';
  }

  static getLoadTime(componentName: string): number | null {
    const component = this.loadingComponents.get(componentName);
    if (!component) return null;
    return Date.now() - component.startTime;
  }

  static shouldShowTimeout(componentName: string, timeoutMs: number): boolean {
    const component = this.loadingComponents.get(componentName);
    if (!component || component.status !== 'loading') return false;
    return Date.now() - component.startTime > timeoutMs;
  }
}

// 网络状态检测器
export class NetworkDetector {
  private static instance: NetworkDetector;
  private connectionType: string = 'unknown';
  private effectiveType: string = 'unknown';
  private downlink: number = 0;

  static getInstance(): NetworkDetector {
    if (!this.instance) {
      this.instance = new NetworkDetector();
    }
    return this.instance;
  }

  constructor() {
    this.detectNetworkInfo();
    this.setupNetworkListeners();
  }

  private detectNetworkInfo() {
    if ('navigator' in window && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      this.connectionType = connection.type || 'unknown';
      this.effectiveType = connection.effectiveType || 'unknown';
      this.downlink = connection.downlink || 0;
    }
  }

  private setupNetworkListeners() {
    if ('navigator' in window && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', () => {
        this.detectNetworkInfo();
      });
    }
  }

  isSlowConnection(): boolean {
    // 2G 或 slow-2g 认为是慢网络
    return this.effectiveType === '2g' || this.effectiveType === 'slow-2g';
  }

  getConnectionInfo() {
    return {
      type: this.connectionType,
      effectiveType: this.effectiveType,
      downlink: this.downlink,
      isSlow: this.isSlowConnection()
    };
  }

  getRecommendedTimeout(): number {
    if (this.isSlowConnection()) {
      return 45000; // 45秒
    } else if (this.effectiveType === '3g') {
      return 25000; // 25秒
    }
    return 15000; // 15秒
  }
}

// 组件预加载器
export class ComponentPreloader {
  private static preloadCache = new Map<string, Promise<any>>();

  static preload(importFn: () => Promise<any>, key?: string): Promise<any> {
    const cacheKey = key || importFn.toString();
    
    if (!this.preloadCache.has(cacheKey)) {
      const promise = importFn().catch(error => {
        // 预加载失败时，从缓存中移除，允许重试
        this.preloadCache.delete(cacheKey);
        console.warn('Component preload failed:', error);
        throw error;
      });
      
      this.preloadCache.set(cacheKey, promise);
    }
    
    return this.preloadCache.get(cacheKey)!;
  }

  static clearCache(key?: string) {
    if (key) {
      this.preloadCache.delete(key);
    } else {
      this.preloadCache.clear();
    }
  }

  static getCacheSize(): number {
    return this.preloadCache.size;
  }
}

// 加载重试管理器
export class LoadingRetryManager {
  private static retryCount = new Map<string, number>();
  private static maxRetries = 3;

  static shouldRetry(componentName: string): boolean {
    const count = this.retryCount.get(componentName) || 0;
    return count < this.maxRetries;
  }

  static incrementRetry(componentName: string): number {
    const count = (this.retryCount.get(componentName) || 0) + 1;
    this.retryCount.set(componentName, count);
    return count;
  }

  static resetRetry(componentName: string) {
    this.retryCount.delete(componentName);
  }

  static getRetryCount(componentName: string): number {
    return this.retryCount.get(componentName) || 0;
  }
}

// 导出工具函数
export const getAdaptiveTimeout = (componentName: string): number => {
  const networkDetector = NetworkDetector.getInstance();
  const baseTimeout = networkDetector.getRecommendedTimeout();
  
  // 根据组件复杂度调整超时时间
  const complexComponents = ['StudyPage', 'StatsPage', 'UploadPage'];
  if (complexComponents.includes(componentName)) {
    return baseTimeout * 1.5;
  }
  
  return baseTimeout;
};

export const shouldShowDetailedError = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

export const getLoadingMessage = (componentName: string, loadTime: number): string => {
  if (loadTime < 1000) return '正在加载...';
  if (loadTime < 5000) return '加载中，请稍候...';
  if (loadTime < 10000) return '网络较慢，继续加载...';
  return '加载时间较长，请耐心等待...';
};

export default {
  ComponentLoadTracker,
  NetworkDetector,
  ComponentPreloader,
  LoadingRetryManager,
  getAdaptiveTimeout,
  shouldShowDetailedError,
  getLoadingMessage
};