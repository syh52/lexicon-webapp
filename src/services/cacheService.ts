import { Wordbook, Word, StudyRecord, DailyStudyPlan, UserSettings } from '../types';

/**
 * 前端数据缓存服务
 * 实现内存缓存和本地存储缓存
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheConfig {
  maxAge: number; // 缓存最大生存时间（毫秒）
  maxSize: number; // 缓存最大数量
  storageKey: string; // 本地存储键名
}

class CacheService {
  private memoryCache = new Map<string, CacheItem<any>>();
  private defaultConfig: CacheConfig = {
    maxAge: 5 * 60 * 1000, // 5分钟
    maxSize: 100,
    storageKey: 'lexicon_cache'
  };

  /**
   * 设置缓存
   */
  set<T>(key: string, data: T, config: Partial<CacheConfig> = {}): void {
    const finalConfig = { ...this.defaultConfig, ...config };
    const now = Date.now();
    
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: now,
      expiresAt: now + finalConfig.maxAge
    };

    // 内存缓存
    this.memoryCache.set(key, cacheItem);
    
    // 清理过期的内存缓存
    this.cleanupMemoryCache();
    
    // 本地存储缓存（仅对重要数据）
    if (this.shouldPersist(key)) {
      this.setLocalStorage(key, cacheItem, finalConfig);
    }
  }

  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    const now = Date.now();
    
    // 先从内存缓存获取
    const memoryCacheItem = this.memoryCache.get(key);
    if (memoryCacheItem && memoryCacheItem.expiresAt > now) {
      return memoryCacheItem.data;
    }
    
    // 从本地存储获取
    const localCacheItem = this.getLocalStorage<T>(key);
    if (localCacheItem && localCacheItem.expiresAt > now) {
      // 将本地存储的数据重新放入内存缓存
      this.memoryCache.set(key, localCacheItem);
      return localCacheItem.data;
    }
    
    // 清理过期缓存
    this.memoryCache.delete(key);
    this.removeLocalStorage(key);
    
    return null;
  }

  /**
   * 删除缓存
   */
  delete(key: string): void {
    this.memoryCache.delete(key);
    this.removeLocalStorage(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.memoryCache.clear();
    this.clearLocalStorage();
  }

  /**
   * 检查缓存是否存在且有效
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    memorySize: number;
    localStorageSize: number;
    oldestItem: string | null;
    newestItem: string | null;
  } {
    const now = Date.now();
    let oldestTimestamp = Infinity;
    let newestTimestamp = 0;
    let oldestItem: string | null = null;
    let newestItem: string | null = null;

    for (const [key, item] of this.memoryCache) {
      if (item.expiresAt > now) {
        if (item.timestamp < oldestTimestamp) {
          oldestTimestamp = item.timestamp;
          oldestItem = key;
        }
        if (item.timestamp > newestTimestamp) {
          newestTimestamp = item.timestamp;
          newestItem = key;
        }
      }
    }

    return {
      memorySize: this.memoryCache.size,
      localStorageSize: this.getLocalStorageSize(),
      oldestItem,
      newestItem
    };
  }

  /**
   * 清理过期的内存缓存
   */
  private cleanupMemoryCache(): void {
    const now = Date.now();
    
    for (const [key, item] of this.memoryCache) {
      if (item.expiresAt <= now) {
        this.memoryCache.delete(key);
      }
    }
    
    // 如果缓存数量超过限制，删除最旧的项
    if (this.memoryCache.size > this.defaultConfig.maxSize) {
      const sortedEntries = Array.from(this.memoryCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const itemsToRemove = sortedEntries.slice(0, this.memoryCache.size - this.defaultConfig.maxSize);
      itemsToRemove.forEach(([key]) => this.memoryCache.delete(key));
    }
  }

  /**
   * 判断是否需要持久化到本地存储
   */
  private shouldPersist(key: string): boolean {
    const persistKeys = [
      'wordbooks_',
      'user_settings_',
      'study_records_',
      'daily_plan_'
    ];
    
    return persistKeys.some(prefix => key.startsWith(prefix));
  }

  /**
   * 设置本地存储
   */
  private setLocalStorage<T>(key: string, item: CacheItem<T>, config: CacheConfig): void {
    try {
      const storage = localStorage.getItem(config.storageKey);
      const cacheStorage = storage ? JSON.parse(storage) : {};
      
      cacheStorage[key] = item;
      
      // 限制本地存储大小
      const keys = Object.keys(cacheStorage);
      if (keys.length > config.maxSize) {
        const sortedKeys = keys.sort((a, b) => cacheStorage[a].timestamp - cacheStorage[b].timestamp);
        const keysToRemove = sortedKeys.slice(0, keys.length - config.maxSize);
        keysToRemove.forEach(k => delete cacheStorage[k]);
      }
      
      localStorage.setItem(config.storageKey, JSON.stringify(cacheStorage));
    } catch (error) {
      console.warn('本地存储设置失败:', error);
    }
  }

  /**
   * 获取本地存储
   */
  private getLocalStorage<T>(key: string): CacheItem<T> | null {
    try {
      const storage = localStorage.getItem(this.defaultConfig.storageKey);
      if (!storage) return null;
      
      const cacheStorage = JSON.parse(storage);
      return cacheStorage[key] || null;
    } catch (error) {
      console.warn('本地存储获取失败:', error);
      return null;
    }
  }

  /**
   * 删除本地存储项
   */
  private removeLocalStorage(key: string): void {
    try {
      const storage = localStorage.getItem(this.defaultConfig.storageKey);
      if (!storage) return;
      
      const cacheStorage = JSON.parse(storage);
      delete cacheStorage[key];
      
      localStorage.setItem(this.defaultConfig.storageKey, JSON.stringify(cacheStorage));
    } catch (error) {
      console.warn('本地存储删除失败:', error);
    }
  }

  /**
   * 清空本地存储
   */
  private clearLocalStorage(): void {
    try {
      localStorage.removeItem(this.defaultConfig.storageKey);
    } catch (error) {
      console.warn('本地存储清空失败:', error);
    }
  }

  /**
   * 获取本地存储大小
   */
  private getLocalStorageSize(): number {
    try {
      const storage = localStorage.getItem(this.defaultConfig.storageKey);
      if (!storage) return 0;
      
      const cacheStorage = JSON.parse(storage);
      return Object.keys(cacheStorage).length;
    } catch (error) {
      return 0;
    }
  }
}

// 创建单例实例
const cacheService = new CacheService();

/**
 * 专门的缓存方法，为不同类型的数据提供特定的缓存策略
 */

// 词书缓存
export const wordbooksCache = {
  set: (wordbooks: Wordbook[]) => 
    cacheService.set('wordbooks_list', wordbooks, { maxAge: 10 * 60 * 1000 }),
  get: (): Wordbook[] | null => 
    cacheService.get<Wordbook[]>('wordbooks_list'),
  clear: () => 
    cacheService.delete('wordbooks_list')
};

// 单词缓存
export const wordsCache = {
  set: (wordbookId: string, words: Word[]) => 
    cacheService.set(`words_${wordbookId}`, words, { maxAge: 15 * 60 * 1000 }),
  get: (wordbookId: string): Word[] | null => 
    cacheService.get<Word[]>(`words_${wordbookId}`),
  clear: (wordbookId: string) => 
    cacheService.delete(`words_${wordbookId}`)
};

// 学习记录缓存
export const studyRecordsCache = {
  set: (uid: string, wordbookId: string, records: StudyRecord[]) => 
    cacheService.set(`study_records_${uid}_${wordbookId}`, records, { maxAge: 5 * 60 * 1000 }),
  get: (uid: string, wordbookId: string): StudyRecord[] | null => 
    cacheService.get<StudyRecord[]>(`study_records_${uid}_${wordbookId}`),
  clear: (uid: string, wordbookId: string) => 
    cacheService.delete(`study_records_${uid}_${wordbookId}`)
};

// 每日学习计划缓存
export const dailyPlanCache = {
  set: (uid: string, wordbookId: string, plan: DailyStudyPlan) => 
    cacheService.set(`daily_plan_${uid}_${wordbookId}`, plan, { maxAge: 30 * 60 * 1000 }),
  get: (uid: string, wordbookId: string): DailyStudyPlan | null => 
    cacheService.get<DailyStudyPlan>(`daily_plan_${uid}_${wordbookId}`),
  clear: (uid: string, wordbookId: string) => 
    cacheService.delete(`daily_plan_${uid}_${wordbookId}`)
};

// 用户设置缓存
export const userSettingsCache = {
  set: (uid: string, settings: UserSettings) => 
    cacheService.set(`user_settings_${uid}`, settings, { maxAge: 60 * 60 * 1000 }),
  get: (uid: string): UserSettings | null => 
    cacheService.get<UserSettings>(`user_settings_${uid}`),
  clear: (uid: string) => 
    cacheService.delete(`user_settings_${uid}`)
};

// 缓存装饰器
export const withCache = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  getCacheKey: (...args: Parameters<T>) => string,
  maxAge: number = 5 * 60 * 1000
): T => {
  return (async (...args: Parameters<T>) => {
    const cacheKey = getCacheKey(...args);
    
    // 尝试从缓存获取
    const cachedResult = cacheService.get(cacheKey);
    if (cachedResult !== null) {
      return cachedResult;
    }
    
    // 缓存未命中，执行原函数
    const result = await fn(...args);
    
    // 将结果缓存
    cacheService.set(cacheKey, result, { maxAge });
    
    return result;
  }) as T;
};

// 导出主要的缓存服务
export default cacheService;

// 缓存管理工具
export const cacheManager = {
  // 获取缓存统计信息
  getStats: () => cacheService.getStats(),
  
  // 清空所有缓存
  clearAll: () => cacheService.clear(),
  
  // 预热缓存
  warmup: async (uid: string) => {
    // 这里可以预加载用户常用的数据
    console.log(`预热用户 ${uid} 的缓存`);
  },
  
  // 缓存健康检查
  healthCheck: () => {
    const stats = cacheService.getStats();
    const isHealthy = stats.memorySize < 1000 && stats.localStorageSize < 500;
    
    return {
      isHealthy,
      stats,
      recommendations: isHealthy ? [] : [
        '缓存大小过大，建议清理',
        '考虑减少缓存时间',
        '检查是否有内存泄漏'
      ]
    };
  }
};