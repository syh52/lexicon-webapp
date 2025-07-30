/**
 * 智能学习计划服务
 * 集成优化器到现有学习系统中
 */

import { unifiedStudyPlanService, UnifiedStudyPlan } from './unifiedStudyPlanService';
import { intelligentPlanOptimizer, LearningAnalytics } from './intelligentPlanOptimizer';
import { studySessionService } from './studySessionService';
import { SM2Service } from './sm2Service';
import { DailyStudyPlan } from './DailyPlanGenerator';
import { userSettingsService, UserSettings } from './userSettingsService';

export interface SmartPlanResult {
  originalPlan: UnifiedStudyPlan;
  optimizedPlan?: UnifiedStudyPlan;
  analytics: LearningAnalytics;
  optimizationApplied: boolean;
  changes: string[];
  recommendations: string[];
}

export class SmartPlanService {
  private static instance: SmartPlanService;
  private sm2Service = new SM2Service();
  
  static getInstance(): SmartPlanService {
    if (!SmartPlanService.instance) {
      SmartPlanService.instance = new SmartPlanService();
    }
    return SmartPlanService.instance;
  }

  /**
   * 获取智能优化的学习计划
   */
  async getSmartPlan(userId: string, wordbookId: string): Promise<SmartPlanResult> {
    try {
      console.log('🧠 开始生成智能学习计划...');

      // 1. 获取基础学习计划
      const originalPlan = await unifiedStudyPlanService.getUnifiedStudyPlan(userId, wordbookId);
      
      // 2. 获取历史学习数据
      const [historicalSessions, sm2Cards, userSettings] = await Promise.all([
        this.getHistoricalSessions(userId, wordbookId),
        this.sm2Service.getUserSM2Records(userId, wordbookId),
        userSettingsService.getUserSettings(userId)
      ]);

      // 3. 分析学习模式
      const analytics = await intelligentPlanOptimizer.analyzeLearningPattern(
        userId,
        wordbookId,
        historicalSessions,
        sm2Cards
      );

      // 4. 判断是否需要优化
      const shouldOptimize = this.shouldApplyOptimization(analytics, historicalSessions.length);
      
      let optimizedPlan: UnifiedStudyPlan | undefined;
      let changes: string[] = [];
      
      if (shouldOptimize) {
        // 5. 应用智能优化
        const optimizationResult = intelligentPlanOptimizer.optimizeDailyPlan(
          this.convertToDailyPlan(originalPlan),
          analytics,
          userSettings
        );
        
        changes = optimizationResult.changes;
        
        // 6. 将优化结果转换回统一计划格式
        optimizedPlan = await this.applyOptimizationToUnifiedPlan(
          originalPlan,
          optimizationResult.optimizedPlan
        );
      }

      // 7. 生成用户友好的建议
      const recommendations = this.generateUserRecommendations(analytics, changes);

      const result: SmartPlanResult = {
        originalPlan,
        optimizedPlan,
        analytics,
        optimizationApplied: shouldOptimize,
        changes,
        recommendations
      };

      console.log('✅ 智能学习计划生成完成:', {
        optimizationApplied: result.optimizationApplied,
        changesCount: changes.length,
        efficiency: analytics.learningEfficiency
      });

      return result;

    } catch (error) {
      console.error('❌ 智能学习计划生成失败:', error);
      
      // 返回基础计划作为降级处理
      const originalPlan = await unifiedStudyPlanService.getUnifiedStudyPlan(userId, wordbookId);
      return {
        originalPlan,
        analytics: this.getDefaultAnalytics(),
        optimizationApplied: false,
        changes: [],
        recommendations: ['使用标准学习计划，建议持续学习以获得个性化优化']
      };
    }
  }

  /**
   * 获取智能复习提醒
   */
  async getSmartReviewReminders(userId: string, wordbookId: string) {
    try {
      const sm2Cards = await this.sm2Service.getUserSM2Records(userId, wordbookId);
      return intelligentPlanOptimizer.generateReviewReminders(sm2Cards);
    } catch (error) {
      console.error('❌ 获取智能复习提醒失败:', error);
      return [];
    }
  }

  /**
   * 更新学习反馈并触发计划调整
   */
  async updateLearningFeedback(
    userId: string, 
    wordbookId: string, 
    sessionCompleted: boolean,
    studyTime: number
  ): Promise<void> {
    try {
      // 记录学习反馈
      console.log('📊 记录学习反馈:', { sessionCompleted, studyTime });
      
      // 如果完成了学习，可以触发计划重新评估
      if (sessionCompleted) {
        // 清除相关缓存，下次获取时会重新分析
        await this.clearAnalyticsCache(userId, wordbookId);
      }
      
    } catch (error) {
      console.error('❌ 更新学习反馈失败:', error);
    }
  }

  // 私有方法：获取历史学习会话
  private async getHistoricalSessions(userId: string, wordbookId: string) {
    try {
      // 这里应该从数据库获取最近的学习会话记录
      // 简化实现：尝试从本地存储获取
      const sessions = [];
      
      // 获取最近7天的会话数据（简化实现）
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        try {
          const sessionState = studySessionService.loadFromLocalStorage(userId, wordbookId, dateStr);
          if (sessionState) {
            sessions.push(sessionState);
          }
        } catch (e) {
          // 忽略加载失败的会话
        }
      }
      
      return sessions;
    } catch (error) {
      console.warn('获取历史会话失败，使用空数组:', error);
      return [];
    }
  }

  // 私有方法：判断是否应该应用优化
  private shouldApplyOptimization(analytics: LearningAnalytics, sessionCount: number): boolean {
    // 至少需要3次学习记录才能进行优化
    if (sessionCount < 3) {
      return false;
    }

    // 如果完成率很低或学习效率很低，应该优化
    if (analytics.completionRate < 60 || analytics.learningEfficiency < 60) {
      return true;
    }

    // 如果有高置信度的优化建议，应该优化
    const highConfidenceRecommendations = analytics.recommendations.filter(r => r.confidence > 75);
    return highConfidenceRecommendations.length > 0;
  }

  // 私有方法：转换统一计划为每日计划格式
  private convertToDailyPlan(unifiedPlan: UnifiedStudyPlan): DailyStudyPlan {
    return {
      userId: unifiedPlan.userId,
      wordbookId: unifiedPlan.wordbookId,
      date: unifiedPlan.date,
      plannedWords: [], // 这里需要从实际数据获取
      totalCount: unifiedPlan.displayPlan.totalCount,
      newWordsCount: unifiedPlan.displayPlan.newWordsCount,
      reviewWordsCount: unifiedPlan.displayPlan.reviewWordsCount,
      completedWords: [],
      currentIndex: 0,
      completedCount: unifiedPlan.displayPlan.completedCount,
      stats: {
        knownCount: unifiedPlan.stats.knownCount,
        unknownCount: unifiedPlan.stats.unknownCount,
        hintCount: unifiedPlan.stats.hintCount,
        studyTime: 0,
        accuracy: 0
      },
      isCompleted: unifiedPlan.displayPlan.isCompleted,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  // 私有方法：将优化结果应用到统一计划
  private async applyOptimizationToUnifiedPlan(
    originalPlan: UnifiedStudyPlan,
    optimizedDailyPlan: DailyStudyPlan
  ): Promise<UnifiedStudyPlan> {
    const optimizedPlan: UnifiedStudyPlan = {
      ...originalPlan,
      displayPlan: {
        ...originalPlan.displayPlan,
        totalCount: optimizedDailyPlan.totalCount,
        newWordsCount: optimizedDailyPlan.newWordsCount,
        reviewWordsCount: optimizedDailyPlan.reviewWordsCount,
        percentage: originalPlan.displayPlan.totalCount > 0 ? 
          Math.round((originalPlan.displayPlan.completedCount / optimizedDailyPlan.totalCount) * 100) : 0
      },
      actualSession: {
        ...originalPlan.actualSession,
        totalCards: optimizedDailyPlan.totalCount,
      },
      lastSyncTime: Date.now()
    };

    return optimizedPlan;
  }

  // 私有方法：生成用户友好的建议
  private generateUserRecommendations(analytics: LearningAnalytics, changes: string[]): string[] {
    const recommendations: string[] = [];

    // 基于完成率的建议
    if (analytics.completionRate < 50) {
      recommendations.push('🎯 建议降低每日学习目标，先建立学习习惯');
    } else if (analytics.completionRate > 85) {
      recommendations.push('🚀 学习状态很好！可以适当增加学习量');
    }

    // 基于学习效率的建议
    if (analytics.learningEfficiency < 60) {
      recommendations.push('⏰ 建议分多次短时间学习，提高学习效率');
    }

    // 基于学习时长的建议
    if (analytics.averageStudyTime > analytics.optimalStudyTime * 1.5) {
      recommendations.push('🔄 学习时间较长，建议适当休息避免疲劳');
    }

    // 基于记忆保持率的建议
    if (analytics.retentionRate < 60) {
      recommendations.push('🔁 建议增加复习频率，巩固记忆效果');
    }

    // 添加优化变更说明
    if (changes.length > 0) {
      recommendations.push('✨ 已根据您的学习情况自动优化计划');
    }

    // 如果没有具体建议，提供通用建议
    if (recommendations.length === 0) {
      recommendations.push('📚 保持当前学习节奏，继续努力！');
    }

    return recommendations;
  }

  // 私有方法：清除分析缓存
  private async clearAnalyticsCache(userId: string, wordbookId: string): Promise<void> {
    // 这里可以清除相关的缓存
    console.log('🗑️ 清除学习分析缓存');
  }

  // 私有方法：获取默认分析结果
  private getDefaultAnalytics(): LearningAnalytics {
    return {
      averageStudyTime: 15 * 60 * 1000,
      completionRate: 50,
      difficultyPreference: 'normal',
      retentionRate: 50,
      learningEfficiency: 50,
      optimalStudyTime: 15 * 60 * 1000,
      newWordPerformance: 50,
      reviewWordPerformance: 50,
      recommendations: []
    };
  }
}

// 导出单例实例
export const smartPlanService = SmartPlanService.getInstance();