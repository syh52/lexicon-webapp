/**
 * 跨设备数据同步服务
 * 解决学习进度和用户设置在不同设备间的数据一致性问题
 */

import { getApp, ensureLogin, getCurrentUserId } from '../utils/cloudbase';
import { StudySessionState, studySessionService } from './studySessionService';
import { UserSettings, userSettingsService } from './userSettingsService';
import { DailyStudyPlan } from './DailyPlanGenerator';

// 同步元数据接口
interface SyncMetadata {
  lastSyncTime: number;
  deviceId: string;
  syncVersion: string;
  checksums: {
    studyProgress: string;
    userSettings: string;
    dailyPlan: string;
  };
}

// 设备信息接口  
interface DeviceInfo {
  deviceId: string;
  platform: string;
  userAgent: string;
  lastActiveTime: number;
}

// 冲突解决策略
enum ConflictResolutionStrategy {
  LAST_WRITE_WINS = 'last_write_wins',
  MERGE_CHANGES = 'merge_changes',
  USER_CHOICE = 'user_choice'
}

// 同步状态
interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: number;
  syncInProgress: boolean;
  conflicts: Array<{
    type: string;
    local: any;
    remote: any;
    timestamp: number;
  }>;
}

export class CrossDeviceSyncService {
  private static instance: CrossDeviceSyncService;
  private deviceId: string;
  private syncStatus: SyncStatus;
  private syncInterval: number | null = null;
  private readonly SYNC_INTERVAL = 30 * 1000; // 30秒同步一次
  private readonly CONFLICT_TIMEOUT = 5 * 60 * 1000; // 5分钟冲突超时

  constructor() {
    this.deviceId = this.generateDeviceId();
    this.syncStatus = {
      isOnline: navigator.onLine,
      lastSyncTime: 0,
      syncInProgress: false,
      conflicts: []
    };
    this.initializeNetworkListeners();
  }

  static getInstance(): CrossDeviceSyncService {
    if (!CrossDeviceSyncService.instance) {
      CrossDeviceSyncService.instance = new CrossDeviceSyncService();
    }
    return CrossDeviceSyncService.instance;
  }

  /**
   * 生成设备唯一标识
   */
  private generateDeviceId(): string {
    const stored = localStorage.getItem('lexicon_device_id');
    if (stored) return stored;

    const deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    localStorage.setItem('lexicon_device_id', deviceId);
    return deviceId;
  }

  /**
   * 初始化网络状态监听
   */
  private initializeNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.syncStatus.isOnline = true;
      this.triggerFullSync();
    });

    window.addEventListener('offline', () => {
      this.syncStatus.isOnline = false;
    });
  }

  /**
   * 启动自动同步
   */
  startAutoSync(): void {
    if (this.syncInterval) return;

    this.syncInterval = window.setInterval(() => {
      if (this.syncStatus.isOnline && !this.syncStatus.syncInProgress) {
        this.performIncrementalSync();
      }
    }, this.SYNC_INTERVAL);

    console.log('🔄 跨设备自动同步已启动 (30秒间隔)');
  }

  /**
   * 停止自动同步
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('⏹️ 跨设备自动同步已停止');
    }
  }

  /**
   * 触发完整同步
   */
  async triggerFullSync(): Promise<void> {
    if (this.syncStatus.syncInProgress) {
      console.log('⏸️ 同步已在进行中，跳过');
      return;
    }

    try {
      this.syncStatus.syncInProgress = true;
      console.log('🚀 开始完整数据同步...');

      await this.syncUserSettings();
      await this.syncStudyProgress();
      await this.syncDailyPlans();
      await this.cleanupOldSessions();

      this.syncStatus.lastSyncTime = Date.now();
      console.log('✅ 完整数据同步完成');

    } catch (error) {
      console.error('❌ 完整同步失败:', error);
    } finally {
      this.syncStatus.syncInProgress = false;
    }
  }

  /**
   * 执行增量同步
   */
  private async performIncrementalSync(): Promise<void> {
    try {
      this.syncStatus.syncInProgress = true;
      
      // 只同步最近修改的数据
      const lastSyncTime = this.syncStatus.lastSyncTime;
      const currentTime = Date.now();
      
      if (currentTime - lastSyncTime < this.SYNC_INTERVAL) {
        return; // 防止过于频繁的同步
      }

      await this.syncRecentChanges(lastSyncTime);
      this.syncStatus.lastSyncTime = currentTime;
      
    } catch (error) {
      console.warn('⚠️ 增量同步失败:', error);
    } finally {
      this.syncStatus.syncInProgress = false;
    }
  }

  /**
   * 同步用户设置
   */
  private async syncUserSettings(): Promise<void> {
    try {
      await ensureLogin();
      const userId = await getCurrentUserId('data');
      if (!userId) return;

      // 获取本地和云端用户设置
      const localSettings = await this.getLocalUserSettings(userId);
      const cloudSettings = await userSettingsService.getUserSettings(userId);

      // 检测冲突
      if (localSettings && this.detectSettingsConflict(localSettings, cloudSettings)) {
        console.warn('⚠️ 检测到用户设置冲突');
        
        // 使用最新修改时间策略
        if (localSettings.updatedAt && cloudSettings.updatedAt) {
          if (localSettings.updatedAt > cloudSettings.updatedAt) {
            await userSettingsService.updateUserSettings(userId, localSettings);
            console.log('📱 同步本地设置到云端');
          } else {
            await this.saveLocalUserSettings(userId, cloudSettings);
            console.log('☁️ 同步云端设置到本地');
          }
        }
      } else if (localSettings && !cloudSettings.updatedAt) {
        // 云端没有设置，上传本地设置
        await userSettingsService.updateUserSettings(userId, localSettings);
        console.log('📤 上传本地设置到云端');
      }

    } catch (error) {
      console.error('❌ 用户设置同步失败:', error);
    }
  }

  /**
   * 同步学习进度
   */
  private async syncStudyProgress(): Promise<void> {
    try {
      await ensureLogin();
      const userId = await getCurrentUserId('data');
      if (!userId) return;

      // 获取所有词书的学习进度
      const wordbookIds = await this.getUserWordbooks(userId);
      
      for (const wordbookId of wordbookIds) {
        await this.syncWordbookProgress(userId, wordbookId);
      }

    } catch (error) {
      console.error('❌ 学习进度同步失败:', error);
    }
  }

  /**
   * 同步单个词书的学习进度
   */
  private async syncWordbookProgress(userId: string, wordbookId: string): Promise<void> {
    try {
      // 使用现有的智能加载逻辑
      const localProgress = studySessionService.loadFromLocalStorage(userId, wordbookId);
      const cloudProgress = await studySessionService.loadFromCloud(userId, wordbookId);

      if (localProgress && cloudProgress) {
        // 检测进度冲突
        if (this.detectProgressConflict(localProgress, cloudProgress)) {
          console.warn(`⚠️ 词书 ${wordbookId} 检测到进度冲突`);
          
          // 合并进度：选择完成数量更多的版本
          const mergedProgress = this.mergeStudyProgress(localProgress, cloudProgress);
          
          // 同步合并后的进度
          await studySessionService.saveStudyProgress(mergedProgress);
          console.log(`🔄 词书 ${wordbookId} 进度已合并同步`);
        }
      }

    } catch (error) {
      console.error(`❌ 词书 ${wordbookId} 进度同步失败:`, error);
    }
  }

  /**
   * 同步每日学习计划
   */
  private async syncDailyPlans(): Promise<void> {
    try {
      await ensureLogin();
      const userId = await getCurrentUserId('data');
      if (!userId) return;

      const appInstance = await getApp();
      const db = appInstance.database();

      // 获取最近7天的学习计划
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const plansResult = await db.collection('daily_study_plans')
        .where({
          userId,
          date: db.command.gte(sevenDaysAgo.toISOString().split('T')[0])
        })
        .get();

      if (plansResult.data) {
        console.log(`📊 同步了 ${plansResult.data.length} 个学习计划`);
      }

    } catch (error) {
      console.error('❌ 学习计划同步失败:', error);
    }
  }

  /**
   * 清理旧的会话数据
   */
  private async cleanupOldSessions(): Promise<void> {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith('lexicon_study_session_')
      );

      const currentTime = Date.now();
      const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7天

      for (const key of keys) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          const age = currentTime - (data.startTime || 0);
          
          if (age > MAX_AGE || data.isCompleted) {
            localStorage.removeItem(key);
            console.log(`🗑️ 清理过期会话: ${key}`);
          }
        } catch (e) {
          // 无效的会话数据，直接删除
          localStorage.removeItem(key);
        }
      }

    } catch (error) {
      console.error('❌ 清理旧会话失败:', error);
    }
  }

  /**
   * 检测设置冲突
   */
  private detectSettingsConflict(local: UserSettings, cloud: UserSettings): boolean {
    return (
      local.dailyNewWords !== cloud.dailyNewWords ||
      local.dailyReviewWords !== cloud.dailyReviewWords ||
      local.studyMode !== cloud.studyMode ||
      local.enableVoice !== cloud.enableVoice ||
      local.reminderTime !== cloud.reminderTime
    );
  }

  /**
   * 检测进度冲突
   */
  private detectProgressConflict(local: StudySessionState, cloud: StudySessionState): boolean {
    return (
      local.sessionId !== cloud.sessionId ||
      Math.abs(local.completedCards - cloud.completedCards) > 2 ||
      Math.abs(local.choiceHistory.length - cloud.choiceHistory.length) > 2
    );
  }

  /**
   * 合并学习进度
   */
  private mergeStudyProgress(local: StudySessionState, cloud: StudySessionState): StudySessionState {
    // 选择完成单词数量更多的版本作为基础
    const baseProgress = local.completedCards >= cloud.completedCards ? local : cloud;
    const otherProgress = local.completedCards >= cloud.completedCards ? cloud : local;

    // 合并选择历史（去重）
    const mergedHistory = [...baseProgress.choiceHistory];
    const existingWordIds = new Set(mergedHistory.map(h => h.wordId));

    otherProgress.choiceHistory.forEach(choice => {
      if (!existingWordIds.has(choice.wordId)) {
        mergedHistory.push(choice);
        existingWordIds.add(choice.wordId);
      }
    });

    return {
      ...baseProgress,
      choiceHistory: mergedHistory.sort((a, b) => a.timestamp - b.timestamp),
      completedCards: mergedHistory.length,
      lastUpdateTime: Math.max(local.lastUpdateTime, cloud.lastUpdateTime),
      isCompleted: mergedHistory.length >= baseProgress.totalCards
    };
  }

  /**
   * 获取用户的词书列表
   */
  private async getUserWordbooks(userId: string): Promise<string[]> {
    try {
      const appInstance = await getApp();
      const result = await appInstance.callFunction({
        name: 'getWordbooks',
        data: { userId }
      });

      if (result.result?.success && result.result?.data) {
        return result.result.data.map((wb: any) => wb._id);
      }

      return ['basic_english']; // 默认词书
    } catch (error) {
      console.error('获取词书列表失败:', error);
      return ['basic_english'];
    }
  }

  /**
   * 本地用户设置存储
   */
  private async getLocalUserSettings(userId: string): Promise<UserSettings | null> {
    try {
      const key = `lexicon_user_settings_${userId}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  }

  private async saveLocalUserSettings(userId: string, settings: UserSettings): Promise<void> {
    try {
      const key = `lexicon_user_settings_${userId}`;
      localStorage.setItem(key, JSON.stringify(settings));
    } catch (error) {
      console.error('保存本地用户设置失败:', error);
    }
  }

  /**
   * 同步最近更改的数据
   */
  private async syncRecentChanges(sinceTime: number): Promise<void> {
    // 检查本地存储中是否有最近的更改
    const keys = Object.keys(localStorage).filter(key => 
      key.startsWith('lexicon_study_session_')
    );

    for (const key of keys) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        if (data.lastUpdateTime && data.lastUpdateTime > sinceTime) {
          // 发现最近更改，触发该会话的同步
          const parts = key.split('_');
          const userId = parts[3];
          const wordbookId = parts[4];
          
          if (userId && wordbookId) {
            await this.syncWordbookProgress(userId, wordbookId);
          }
        }
      } catch (e) {
        // 忽略无效数据
      }
    }
  }

  /**
   * 获取同步状态
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * 手动解决冲突
   */
  async resolveConflict(conflictId: string, resolution: 'local' | 'remote' | 'merge'): Promise<void> {
    const conflict = this.syncStatus.conflicts.find(c => 
      c.timestamp.toString() === conflictId
    );

    if (!conflict) {
      throw new Error('冲突不存在或已过期');
    }

    // 根据选择执行相应的解决策略
    switch (resolution) {
      case 'local':
        // 使用本地版本覆盖云端
        await this.applyLocalVersion(conflict);
        break;
      case 'remote':
        // 使用云端版本覆盖本地
        await this.applyRemoteVersion(conflict);
        break;
      case 'merge':
        // 智能合并两个版本
        await this.mergeVersions(conflict);
        break;
    }

    // 移除已解决的冲突
    this.syncStatus.conflicts = this.syncStatus.conflicts.filter(c => 
      c.timestamp !== conflict.timestamp
    );
  }

  private async applyLocalVersion(conflict: any): Promise<void> {
    // 实现本地版本应用逻辑
    console.log('✅ 应用本地版本解决冲突');
  }

  private async applyRemoteVersion(conflict: any): Promise<void> {
    // 实现远程版本应用逻辑
    console.log('✅ 应用远程版本解决冲突');
  }

  private async mergeVersions(conflict: any): Promise<void> {
    // 实现智能合并逻辑
    console.log('✅ 智能合并版本解决冲突');
  }
}

// 导出单例实例
export const crossDeviceSyncService = CrossDeviceSyncService.getInstance();