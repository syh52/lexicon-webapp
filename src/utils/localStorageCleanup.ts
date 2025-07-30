/**
 * 本地存储清理工具
 * 解决多用户ID导致的数据混乱问题
 */

import { getCurrentUserId } from './cloudbase';

export interface CleanupReport {
  removedKeys: string[];
  keptKeys: string[];
  errors: string[];
  summary: {
    totalProcessed: number;
    totalRemoved: number;
    totalKept: number;
    spaceSavedKB: number;
  };
}

export class LocalStorageCleanup {
  /**
   * 执行完整的localStorage清理
   */
  static async performFullCleanup(): Promise<CleanupReport> {
    const report: CleanupReport = {
      removedKeys: [],
      keptKeys: [],
      errors: [],
      summary: {
        totalProcessed: 0,
        totalRemoved: 0,
        totalKept: 0,
        spaceSavedKB: 0
      }
    };

    try {
      // 获取当前用户ID
      const currentUserId = await getCurrentUserId('data');
      if (!currentUserId) {
        throw new Error('无法获取当前用户ID');
      }

      console.log(`🧹 开始清理localStorage，当前用户ID: ${currentUserId}`);

      // 获取所有Lexicon相关的键
      const lexiconKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('lexicon_')
      );

      for (const key of lexiconKeys) {
        report.summary.totalProcessed++;
        
        try {
          const shouldKeep = this.shouldKeepKey(key, currentUserId);
          const sizeKB = this.getKeySizeKB(key);
          
          if (shouldKeep) {
            report.keptKeys.push(key);
            report.summary.totalKept++;
            console.log(`✅ 保留: ${key}`);
          } else {
            localStorage.removeItem(key);
            report.removedKeys.push(key);
            report.summary.totalRemoved++;
            report.summary.spaceSavedKB += sizeKB;
            console.log(`🗑️ 清理: ${key} (${sizeKB.toFixed(2)}KB)`);
          }
        } catch (error) {
          const errorMsg = `处理键 ${key} 失败: ${error}`;
          report.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      console.log(`🎯 清理完成: 处理 ${report.summary.totalProcessed} 项, 清理 ${report.summary.totalRemoved} 项, 节省 ${report.summary.spaceSavedKB.toFixed(2)}KB`);
      
      return report;
    } catch (error) {
      report.errors.push(`清理过程失败: ${error}`);
      console.error('❌ localStorage清理失败:', error);
      return report;
    }
  }

  /**
   * 判断是否应该保留某个键
   */
  private static shouldKeepKey(key: string, currentUserId: string): boolean {
    // 用户信息键 - 保留当前用户的
    if (key === 'lexicon_user') {
      try {
        const userData = JSON.parse(localStorage.getItem(key) || '{}');
        return userData.uid === currentUserId;
      } catch {
        return false; // 无效数据，清理掉
      }
    }

    // 学习会话键 - 只保留当前用户的
    if (key.startsWith('lexicon_study_session_')) {
      const parts = key.split('_');
      if (parts.length >= 4) {
        const userId = parts[3]; // lexicon_study_session_{userId}_{wordbookId}
        return userId === currentUserId;
      }
      return false;
    }

    // 用户设置键 - 只保留当前用户的
    if (key.startsWith('lexicon_user_settings_')) {
      const userId = key.replace('lexicon_user_settings_', '');
      return userId === currentUserId;
    }

    // 设备ID - 始终保留
    if (key === 'lexicon_device_id') {
      return true;
    }

    // 其他CloudBase相关键 - 检查是否包含当前用户ID
    if (key.includes('cloud1-7g7oatv381500c81')) {
      return true; // 保留环境相关配置
    }

    // 缓存键 - 检查时效性
    if (key.startsWith('lexicon_cache_')) {
      return this.isCacheValid(key);
    }

    // 默认保留未知键（谨慎处理）
    console.warn(`⚠️ 未知键类型，默认保留: ${key}`);
    return true;
  }

  /**
   * 检查缓存是否有效
   */
  private static isCacheValid(key: string): boolean {
    try {
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      const now = Date.now();
      const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24小时
      
      if (data.timestamp && (now - data.timestamp) > MAX_CACHE_AGE) {
        return false; // 过期缓存，清理
      }
      
      return true;
    } catch {
      return false; // 无效缓存数据，清理
    }
  }

  /**
   * 计算键占用的存储大小(KB)
   */
  private static getKeySizeKB(key: string): number {
    try {
      const value = localStorage.getItem(key) || '';
      const sizeBytes = new Blob([key + value]).size;
      return sizeBytes / 1024;
    } catch {
      return 0;
    }
  }

  /**
   * 清理特定类型的数据
   */
  static async cleanupByType(type: 'sessions' | 'settings' | 'cache' | 'expired'): Promise<number> {
    let cleaned = 0;
    const keys = Object.keys(localStorage);
    const currentUserId = await getCurrentUserId('data');

    for (const key of keys) {
      let shouldRemove = false;

      switch (type) {
        case 'sessions':
          if (key.startsWith('lexicon_study_session_')) {
            const parts = key.split('_');
            if (parts.length >= 4 && parts[3] !== currentUserId) {
              shouldRemove = true;
            }
          }
          break;

        case 'settings':
          if (key.startsWith('lexicon_user_settings_')) {
            const userId = key.replace('lexicon_user_settings_', '');
            if (userId !== currentUserId) {
              shouldRemove = true;
            }
          }
          break;

        case 'cache':
          if (key.startsWith('lexicon_cache_')) {
            shouldRemove = !this.isCacheValid(key);
          }
          break;

        case 'expired':
          if (key.startsWith('lexicon_study_session_')) {
            try {
              const data = JSON.parse(localStorage.getItem(key) || '{}');
              const age = Date.now() - (data.startTime || 0);
              const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7天
              if (age > MAX_AGE || data.isCompleted) {
                shouldRemove = true;
              }
            } catch {
              shouldRemove = true; // 无效数据
            }
          }
          break;
      }

      if (shouldRemove) {
        localStorage.removeItem(key);
        cleaned++;
        console.log(`🗑️ 清理 ${type}: ${key}`);
      }
    }

    console.log(`✅ ${type} 清理完成，清理了 ${cleaned} 项`);
    return cleaned;
  }

  /**
   * 获取存储使用情况统计
   */
  static getStorageStats(): {
    totalKeys: number;
    lexiconKeys: number;
    totalSizeKB: number;
    lexiconSizeKB: number;
    keysByType: Record<string, number>;
  } {
    const allKeys = Object.keys(localStorage);
    const lexiconKeys = allKeys.filter(key => key.startsWith('lexicon_'));
    
    let totalSize = 0;
    let lexiconSize = 0;
    const keysByType: Record<string, number> = {};

    for (const key of allKeys) {
      const sizeKB = this.getKeySizeKB(key);
      totalSize += sizeKB;
      
      if (key.startsWith('lexicon_')) {
        lexiconSize += sizeKB;
        
        // 按类型分类
        if (key.includes('study_session')) {
          keysByType['sessions'] = (keysByType['sessions'] || 0) + 1;
        } else if (key.includes('user_settings')) {
          keysByType['settings'] = (keysByType['settings'] || 0) + 1;
        } else if (key.includes('cache')) {
          keysByType['cache'] = (keysByType['cache'] || 0) + 1;
        } else {
          keysByType['other'] = (keysByType['other'] || 0) + 1;
        }
      }
    }

    return {
      totalKeys: allKeys.length,
      lexiconKeys: lexiconKeys.length,
      totalSizeKB: totalSize,
      lexiconSizeKB: lexiconSize,
      keysByType
    };
  }

  /**
   * 应急清理 - 清理所有Lexicon数据（谨慎使用）
   */
  static emergencyCleanup(): CleanupReport {
    const report: CleanupReport = {
      removedKeys: [],
      keptKeys: [],
      errors: [],
      summary: {
        totalProcessed: 0,
        totalRemoved: 0,
        totalKept: 0,
        spaceSavedKB: 0
      }
    };

    console.warn('🚨 执行应急清理 - 这将清理所有Lexicon数据！');
    
    const lexiconKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('lexicon_')
    );

    for (const key of lexiconKeys) {
      report.summary.totalProcessed++;
      
      try {
        // 保留设备ID和用户信息
        if (key === 'lexicon_device_id' || key === 'lexicon_user') {
          report.keptKeys.push(key);
          report.summary.totalKept++;
        } else {
          const sizeKB = this.getKeySizeKB(key);
          localStorage.removeItem(key);
          report.removedKeys.push(key);
          report.summary.totalRemoved++;
          report.summary.spaceSavedKB += sizeKB;
        }
      } catch (error) {
        report.errors.push(`清理 ${key} 失败: ${error}`);
      }
    }

    console.log(`🚨 应急清理完成: 清理了 ${report.summary.totalRemoved} 项`);
    return report;
  }
}

// 导出便捷方法
export const cleanupLocalStorage = LocalStorageCleanup.performFullCleanup;
export const getStorageStats = LocalStorageCleanup.getStorageStats;
export const emergencyCleanup = LocalStorageCleanup.emergencyCleanup;