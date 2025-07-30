/**
 * 统一学习计划服务
 * 解决首页和学习页面数据不一致问题
 */

import { DailyStudyPlan } from './DailyPlanGenerator';
import { studySessionService, StudySessionState } from './studySessionService';
import { userSettingsService } from './userSettingsService';
import dailyPlanService from './dailyPlanService';
import { SM2Service, createStudySession } from './sm2Service';
import { getCurrentUserId } from '../utils/cloudbase';

export interface UnifiedStudyPlan {
  // 基础信息
  userId: string;
  wordbookId: string;
  date: string;
  
  // 计划数据（首页显示用）
  displayPlan: {
    totalCount: number;
    newWordsCount: number;
    reviewWordsCount: number;
    completedCount: number;
    percentage: number;
    isCompleted: boolean;
  };
  
  // 实际学习数据（学习页面用）
  actualSession: {
    totalCards: number;
    completedCards: number;
    sessionState?: StudySessionState;
    hasRestoredProgress: boolean;
  };
  
  // 统计信息
  stats: {
    knownCount: number;
    unknownCount: number;
    hintCount: number;
    accuracy: number;
  };
  
  // 同步状态
  lastSyncTime: number;
  isDataConsistent: boolean;
}

export class UnifiedStudyPlanService {
  private static instance: UnifiedStudyPlanService;
  private sm2Service = new SM2Service();
  private planCache = new Map<string, { data: UnifiedStudyPlan; timestamp: number }>();
  
  static getInstance(): UnifiedStudyPlanService {
    if (!UnifiedStudyPlanService.instance) {
      UnifiedStudyPlanService.instance = new UnifiedStudyPlanService();
    }
    return UnifiedStudyPlanService.instance;
  }

  /**
   * 获取统一的学习计划 - 同时适用于首页和学习页面
   */
  async getUnifiedStudyPlan(userId: string, wordbookId: string): Promise<UnifiedStudyPlan> {
    const cacheKey = `${userId}_${wordbookId}_${new Date().toISOString().split('T')[0]}`;
    const now = Date.now();
    
    // 检查缓存（2分钟内有效）
    const cached = this.planCache.get(cacheKey);
    if (cached && now - cached.timestamp < 2 * 60 * 1000) {
      console.log('📦 使用缓存的统一学习计划');
      return cached.data;
    }

    try {
      console.log('🔄 生成统一学习计划:', { userId, wordbookId });

      // 1. 并行获取所有必要数据
      const [dailyPlan, sessionState, userSettings] = await Promise.all([
        dailyPlanService.getTodayStudyPlan(userId, wordbookId),
        studySessionService.loadStudyProgress(userId, wordbookId),
        userSettingsService.getUserSettings(userId)
      ]);

      // 2. 创建SM2会话来获取实际的学习数据
      const sm2Session = await createStudySession(userId, wordbookId, dailyPlan.totalCount);
      
      // 3. 计算实际的学习进度
      let actualTotalCards = sm2Session.getTotalCards();
      let actualCompletedCards = sm2Session.getSessionStats().completed;
      let hasRestoredProgress = false;

      // 4. 如果有保存的会话状态，使用实际进度
      if (sessionState && !sessionState.isCompleted) {
        actualCompletedCards = sessionState.completedCards;
        hasRestoredProgress = true;
        console.log(`🔄 使用已保存进度: ${actualCompletedCards}/${actualTotalCards}`);
      }

      // 5. 检查数据一致性
      const isDataConsistent = Math.abs(dailyPlan.totalCount - actualTotalCards) <= 5; // 允许5个单词的差异
      
      if (!isDataConsistent) {
        console.warn(`⚠️ 数据不一致检测: 显示计划=${dailyPlan.totalCount}, 实际会话=${actualTotalCards}`);
      }

      // 6. 统一数据源 - 优先使用实际SM2数据
      const unifiedTotalCount = actualTotalCards;
      const unifiedCompletedCount = actualCompletedCards;
      const unifiedPercentage = unifiedTotalCount > 0 ? 
        Math.round((unifiedCompletedCount / unifiedTotalCount) * 100) : 0;

      // 7. 创建统一计划
      const unifiedPlan: UnifiedStudyPlan = {
        userId,
        wordbookId,
        date: new Date().toISOString().split('T')[0],
        
        displayPlan: {
          totalCount: unifiedTotalCount,
          newWordsCount: dailyPlan.newWordsCount || 0,
          reviewWordsCount: dailyPlan.reviewWordsCount || 0,
          completedCount: unifiedCompletedCount,
          percentage: unifiedPercentage,
          isCompleted: unifiedCompletedCount >= unifiedTotalCount
        },
        
        actualSession: {
          totalCards: actualTotalCards,
          completedCards: actualCompletedCards,
          sessionState,
          hasRestoredProgress
        },
        
        stats: {
          knownCount: dailyPlan.stats?.knownCount || 0,
          unknownCount: dailyPlan.stats?.unknownCount || 0,
          hintCount: dailyPlan.stats?.hintCount || 0,
          accuracy: dailyPlan.stats?.accuracy || 0
        },
        
        lastSyncTime: now,
        isDataConsistent
      };

      // 8. 缓存结果
      this.planCache.set(cacheKey, {
        data: unifiedPlan,
        timestamp: now
      });

      console.log(`✅ 统一学习计划生成完成: 显示=${unifiedPlan.displayPlan.completedCount}/${unifiedPlan.displayPlan.totalCount}, 实际=${unifiedPlan.actualSession.completedCards}/${unifiedPlan.actualSession.totalCards}`);
      
      return unifiedPlan;

    } catch (error) {
      console.error('❌ 生成统一学习计划失败:', error);
      
      // 降级处理：返回基础计划
      return {
        userId,
        wordbookId,
        date: new Date().toISOString().split('T')[0],
        displayPlan: {
          totalCount: 0,
          newWordsCount: 0,
          reviewWordsCount: 0,
          completedCount: 0,
          percentage: 0,
          isCompleted: false
        },
        actualSession: {
          totalCards: 0,
          completedCards: 0,
          hasRestoredProgress: false
        },
        stats: {
          knownCount: 0,
          unknownCount: 0,
          hintCount: 0,
          accuracy: 0
        },
        lastSyncTime: now,
        isDataConsistent: false
      };
    }
  }

  /**
   * 更新学习进度 - 同时更新显示和实际数据
   */
  async updateProgress(
    userId: string, 
    wordbookId: string, 
    completedWordId: string,
    isKnown: boolean
  ): Promise<void> {
    try {
      // 1. 更新实际的学习进度
      const sessionState = await studySessionService.loadStudyProgress(userId, wordbookId);
      if (sessionState) {
        const updatedState = studySessionService.updateSessionState(
          sessionState,
          completedWordId,
          isKnown ? 'know' as any : 'unknown' as any
        );
        await studySessionService.saveStudyProgress(updatedState);
      }

      // 2. 清除缓存，强制重新生成
      const cacheKey = `${userId}_${wordbookId}_${new Date().toISOString().split('T')[0]}`;
      this.planCache.delete(cacheKey);

      console.log(`📊 学习进度已更新: ${completedWordId} -> ${isKnown ? '认识' : '不认识'}`);
      
    } catch (error) {
      console.error('❌ 更新学习进度失败:', error);
    }
  }

  /**
   * 清理数据不一致 - 重置并重新生成计划
   */
  async fixDataInconsistency(userId: string, wordbookId: string): Promise<UnifiedStudyPlan> {
    try {
      console.log('🔧 开始修复数据不一致问题...');

      // 1. 清除所有缓存
      this.planCache.clear();
      
      // 2. 清除本地学习进度
      await studySessionService.clearAllProgress(userId, wordbookId);
      
      // 3. 重新生成今日计划
      await dailyPlanService.resetTodayPlan(userId, wordbookId);
      
      // 4. 重新获取统一计划
      const unifiedPlan = await this.getUnifiedStudyPlan(userId, wordbookId);
      
      console.log('✅ 数据不一致修复完成');
      return unifiedPlan;
      
    } catch (error) {
      console.error('❌ 修复数据不一致失败:', error);
      throw error;
    }
  }

  /**
   * 跨设备同步数据
   */
  async syncAcrossDevices(userId: string, wordbookId: string): Promise<void> {
    try {
      console.log('🔄 开始跨设备数据同步...');
      
      // 1. 获取最新的云端数据
      const cloudSessionState = await studySessionService.loadFromCloud(userId, wordbookId);
      const localSessionState = studySessionService.loadFromLocalStorage(userId, wordbookId);
      
      // 2. 智能合并数据
      if (cloudSessionState && localSessionState) {
        const mergedState = this.mergeSessionStates(localSessionState, cloudSessionState);
        await studySessionService.saveStudyProgress(mergedState);
        console.log('🔄 数据合并完成');
      } else if (cloudSessionState) {
        // 只有云端数据，下载到本地
        studySessionService.saveToLocalStorage(cloudSessionState);
        console.log('⬇️ 从云端恢复数据');
      } else if (localSessionState) {
        // 只有本地数据，上传到云端
        await studySessionService.saveToCloud(localSessionState);
        console.log('⬆️ 上传本地数据到云端');
      }
      
      // 3. 清除缓存，强制重新生成
      this.planCache.clear();
      
      console.log('✅ 跨设备数据同步完成');
      
    } catch (error) {
      console.error('❌ 跨设备数据同步失败:', error);
    }
  }

  /**
   * 智能合并两个会话状态
   */
  private mergeSessionStates(local: StudySessionState, cloud: StudySessionState): StudySessionState {
    // 选择完成进度更多的版本
    const baseState = local.completedCards >= cloud.completedCards ? local : cloud;
    const otherState = local.completedCards >= cloud.completedCards ? cloud : local;
    
    // 合并选择历史，去重
    const mergedHistory = [...baseState.choiceHistory];
    const existingWordIds = new Set(mergedHistory.map(h => h.wordId));
    
    otherState.choiceHistory.forEach(choice => {
      if (!existingWordIds.has(choice.wordId)) {
        mergedHistory.push(choice);
        existingWordIds.add(choice.wordId);
      }
    });
    
    return {
      ...baseState,
      choiceHistory: mergedHistory.sort((a, b) => a.timestamp - b.timestamp),
      completedCards: mergedHistory.length,
      lastUpdateTime: Math.max(local.lastUpdateTime, cloud.lastUpdateTime),
      isCompleted: mergedHistory.length >= baseState.totalCards
    };
  }

  /**
   * 获取数据统计信息
   */
  getDataStats(userId: string, wordbookId: string): {
    cacheSize: number;
    lastUpdateTime: number;
    inconsistencyCount: number;
  } {
    const cacheKey = `${userId}_${wordbookId}_${new Date().toISOString().split('T')[0]}`;
    const cached = this.planCache.get(cacheKey);
    
    return {
      cacheSize: this.planCache.size,
      lastUpdateTime: cached?.timestamp || 0,
      inconsistencyCount: cached?.data.isDataConsistent ? 0 : 1
    };
  }
}

// 导出单例实例
export const unifiedStudyPlanService = UnifiedStudyPlanService.getInstance();