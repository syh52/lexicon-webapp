import { app, ensureLogin } from '../utils/cloudbase';
import { DailyStudyPlan, DailyPlanGenerator } from './DailyPlanGenerator';
import { SM2Service } from './sm2Service';
import { StudyChoice } from '../types';

// 学习进度更新接口 - 扩展支持SM-2
export interface StudyProgressUpdate {
  wordId: string;
  isKnown: boolean;
  studyTime?: number;
  timestamp?: Date;
  // SM-2扩展字段
  choice?: StudyChoice;
  quality?: number;
  isRepeat?: boolean;
}

// 每日统计接口
export interface DailyStats {
  date: string;
  totalPlanned: number;
  totalCompleted: number;
  newWordsLearned: number;
  reviewWordsCompleted: number;
  accuracy: number;
  studyTime: number;
  isTargetReached: boolean;
}

export const dailyPlanService = {
  _sm2Service: new SM2Service(),

  /**
   * 获取或创建今日学习计划 - 优先使用SM-2算法
   */
  async getTodayStudyPlan(userId: string, wordbookId: string): Promise<DailyStudyPlan> {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      console.log('📚 获取今日学习计划:', { userId, wordbookId, today });
      
      // 优先尝试使用SM-2算法生成计划
      const sm2Plan = await this.createSM2DailyPlan(userId, wordbookId, today);
      if (sm2Plan) {
        console.log('✅ SM-2计划创建成功');
        return sm2Plan;
      }
      
      // 降级到传统方式
      console.log('⚠️ SM-2计划创建失败，使用传统方式');
      return await this.getTraditionalTodayPlan(userId, wordbookId);
    } catch (error) {
      console.error('获取今日学习计划失败:', error);
      // 再次降级到传统方式
      return await this.getTraditionalTodayPlan(userId, wordbookId);
    }
  },

  /**
   * 使用SM-2算法创建每日计划
   */
  async createSM2DailyPlan(userId: string, wordbookId: string, date: string): Promise<DailyStudyPlan | null> {
    try {
      // 获取用户设置
      let userSettings = {
        dailyTarget: 20,
        dailyNewWords: 10,
        dailyReviewWords: 15
      };

      try {
        const userSettingsResult = await app.callFunction({
          name: 'user-settings',
          data: { action: 'get', userId }
        });

        if (userSettingsResult.result?.success && userSettingsResult.result?.data) {
          userSettings = userSettingsResult.result.data;
        }
      } catch (error) {
        console.warn('获取用户设置失败，使用默认设置:', error);
      }

      // 获取所有单词数据
      const wordsResult = await app.callFunction({
        name: 'getWordsByWordbook',
        data: { wordbookId, limit: 1000 }
      });

      if (!wordsResult.result?.success || !wordsResult.result?.data) {
        console.warn('无法获取单词数据，降级到传统方式');
        return null;
      }

      const words = wordsResult.result.data;

      // 使用DailyPlanGenerator的SM-2方法生成计划
      const plan = await DailyPlanGenerator.generateSM2DailyPlan(
        userId,
        wordbookId,
        userSettings,
        words,
        date
      );

      // 保存计划到数据库
      await ensureLogin();
      const db = app.database();
      
      // 检查是否已存在计划
      const existingResult = await db.collection('daily_study_plans')
        .where({ userId, wordbookId, date })
        .get();

      if (existingResult.data && existingResult.data.length > 0) {
        // 更新现有计划
        await db.collection('daily_study_plans')
          .doc(existingResult.data[0]._id)
          .update({
            ...plan,
            updatedAt: new Date()
          });
      } else {
        // 创建新计划
        await db.collection('daily_study_plans').add(plan);
      }

      return plan;
    } catch (error) {
      console.error('创建SM-2每日计划失败:', error);
      return null;
    }
  },

  /**
   * 传统方式获取今日学习计划（降级方案）
   */
  async getTraditionalTodayPlan(userId: string, wordbookId: string): Promise<DailyStudyPlan> {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // 先尝试获取现有计划
      const existingResult = await app.callFunction({
        name: 'daily-plan',
        data: {
          action: 'get',
          userId,
          wordbookId,
          date: today
        }
      });
      
      if (existingResult.result?.success) {
        return existingResult.result.data;
      }
      
      // 如果没有现有计划，创建新的
      const createResult = await app.callFunction({
        name: 'daily-plan',
        data: {
          action: 'create',
          userId,
          wordbookId,
          date: today
        }
      });
      
      if (createResult.result?.success) {
        return createResult.result.data;
      }
      
      throw new Error(createResult.result?.error || '创建学习计划失败');
    } catch (error) {
      console.error('获取传统今日学习计划失败:', error);
      throw error;
    }
  },

  /**
   * 获取指定日期的学习计划 - 使用云函数
   */
  async getDailyPlan(userId: string, wordbookId: string, date: string): Promise<DailyStudyPlan | null> {
    try {
      const result = await app.callFunction({
        name: 'daily-plan',
        data: {
          action: 'get',
          userId,
          wordbookId,
          date
        }
      });
      
      if (result.result?.success) {
        return result.result.data;
      }
      
      return null;
    } catch (error) {
      console.error('获取每日计划失败:', error);
      return null;
    }
  },

  /**
   * 创建新的每日学习计划 - 使用云函数
   */
  async createDailyPlan(userId: string, wordbookId: string, date: string): Promise<DailyStudyPlan> {
    try {
      const result = await app.callFunction({
        name: 'daily-plan',
        data: {
          action: 'create',
          userId,
          wordbookId,
          date
        }
      });
      
      if (result.result?.success) {
        return result.result.data;
      }
      
      throw new Error(result.result?.error || '创建学习计划失败');
    } catch (error) {
      console.error('创建每日计划失败:', error);
      throw error;
    }
  },

  /**
   * 更新学习进度 - 支持SM-2算法
   */
  async updateStudyProgress(
    userId: string,
    wordbookId: string,
    progressUpdate: StudyProgressUpdate
  ): Promise<DailyStudyPlan> {
    try {
      console.log('📊 更新学习进度:', { userId, wordbookId, wordId: progressUpdate.wordId, choice: progressUpdate.choice });
      
      // 如果包含SM-2选择信息，优先使用SM-2处理
      if (progressUpdate.choice) {
        console.log('🎯 使用SM-2算法更新进度');
        return await this.updateSM2Progress(userId, wordbookId, progressUpdate);
      }
      
      // 否则使用传统方式
      console.log('📝 使用传统方式更新进度');
      return await this.updateTraditionalProgress(userId, wordbookId, progressUpdate);
    } catch (error) {
      console.error('更新学习进度失败:', error);
      // 降级到传统方式
      return await this.updateTraditionalProgress(userId, wordbookId, progressUpdate);
    }
  },

  /**
   * 使用SM-2算法更新学习进度
   */
  async updateSM2Progress(
    userId: string,
    wordbookId: string,
    progressUpdate: StudyProgressUpdate
  ): Promise<DailyStudyPlan> {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      await ensureLogin();
      const db = app.database();
      
      // 获取当前计划
      const planResult = await db.collection('daily_study_plans')
        .where({ userId, wordbookId, date: today })
        .get();

      if (!planResult.data || planResult.data.length === 0) {
        throw new Error('未找到今日学习计划');
      }

      const currentPlan = planResult.data[0];
      
      // 使用DailyPlanGenerator更新进度（包含SM-2统计）
      const updatedPlan = DailyPlanGenerator.updatePlanProgress(
        currentPlan,
        progressUpdate.wordId,
        progressUpdate.isKnown,
        progressUpdate.studyTime || 0,
        progressUpdate.choice
      );
      
      // 保存更新后的计划
      await db.collection('daily_study_plans')
        .doc(currentPlan._id)
        .update({
          ...updatedPlan,
          updatedAt: new Date()
        });

      return updatedPlan;
    } catch (error) {
      console.error('更新SM-2学习进度失败:', error);
      throw error;
    }
  },

  /**
   * 传统方式更新学习进度
   */
  async updateTraditionalProgress(
    userId: string,
    wordbookId: string,
    progressUpdate: StudyProgressUpdate
  ): Promise<DailyStudyPlan> {
    try {
      const result = await app.callFunction({
        name: 'daily-plan',
        data: {
          action: 'update',
          userId,
          wordbookId,
          wordId: progressUpdate.wordId,
          isKnown: progressUpdate.isKnown,
          studyTime: progressUpdate.studyTime || 0
        }
      });
      
      if (result.result?.success) {
        return result.result.data;
      }
      
      throw new Error(result.result?.error || '更新学习进度失败');
    } catch (error) {
      console.error('更新传统学习进度失败:', error);
      throw error;
    }
  },

  /**
   * 获取当前学习进度 - 使用云函数
   */
  async getCurrentProgress(userId: string, wordbookId: string): Promise<{
    plan: DailyStudyPlan | null;
    nextWord: string | null;
    progress: number;
    isCompleted: boolean;
  }> {
    try {
      const result = await app.callFunction({
        name: 'daily-plan',
        data: {
          action: 'progress',
          userId,
          wordbookId
        }
      });
      
      if (result.result?.success) {
        return result.result.data;
      }
      
      return {
        plan: null,
        nextWord: null,
        progress: 0,
        isCompleted: false
      };
    } catch (error) {
      console.error('获取当前进度失败:', error);
      return {
        plan: null,
        nextWord: null,
        progress: 0,
        isCompleted: false
      };
    }
  },

  /**
   * 重置今日学习计划
   */
  async resetTodayPlan(userId: string, wordbookId: string): Promise<DailyStudyPlan> {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // 确保用户已登录CloudBase
      await ensureLogin();
      
      // 删除现有计划
      const db = app.database();
      await db.collection('daily_study_plans')
        .where({ userId, wordbookId, date: today })
        .remove();
      
      // 创建新计划
      return await this.createDailyPlan(userId, wordbookId, today);
    } catch (error) {
      console.error('重置今日计划失败:', error);
      throw error;
    }
  },

  /**
   * 获取学习统计 - 使用云函数
   */
  async getStudyStats(userId: string, wordbookId: string, days: number = 7): Promise<DailyStats[]> {
    try {
      const result = await app.callFunction({
        name: 'daily-plan',
        data: {
          action: 'stats',
          userId,
          wordbookId,
          days
        }
      });
      
      if (result.result?.success) {
        return result.result.data;
      }
      
      return [];
    } catch (error) {
      console.error('获取学习统计失败:', error);
      return [];
    }
  },

  /**
   * 获取学习连续天数
   */
  async getStudyStreak(userId: string, wordbookId: string): Promise<number> {
    try {
      // 确保用户已登录CloudBase
      await ensureLogin();
      
      const db = app.database();
      const { data } = await db.collection('daily_study_plans')
        .where({ userId, wordbookId, isCompleted: true })
        .orderBy('date', 'desc')
        .get();
      
      if (!data || data.length === 0) {
        return 0;
      }
      
      let streak = 0;
      let currentDate = new Date();
      
      for (const plan of data) {
        const planDate = new Date(plan.date);
        const diffDays = Math.floor((currentDate.getTime() - planDate.getTime()) / (24 * 60 * 60 * 1000));
        
        if (diffDays === streak) {
          streak++;
          currentDate = planDate;
        } else {
          break;
        }
      }
      
      return streak;
    } catch (error) {
      console.error('获取学习连续天数失败:', error);
      return 0;
    }
  },

  /**
   * 清理过期的学习计划
   */
  async cleanupExpiredPlans(userId: string, daysToKeep: number = 30): Promise<number> {
    try {
      // 确保用户已登录CloudBase
      await ensureLogin();
      
      const db = app.database();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const { data } = await db.collection('daily_study_plans')
        .where({
          userId,
          date: db.command.lt(cutoffDate.toISOString().split('T')[0])
        })
        .remove();
      
      const deletedCount = data?.deleted || 0;
      return deletedCount;
    } catch (error) {
      console.error('清理过期计划失败:', error);
      return 0;
    }
  }
};

export default dailyPlanService;