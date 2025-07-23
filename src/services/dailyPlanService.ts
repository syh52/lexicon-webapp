import { app, ensureLogin } from '../utils/cloudbase';
import { DailyStudyPlan } from './DailyPlanGenerator';

// 学习进度更新接口
export interface StudyProgressUpdate {
  wordId: string;
  isKnown: boolean;
  studyTime?: number;
  timestamp?: Date;
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
  /**
   * 获取或创建今日学习计划 - 使用云函数统一处理
   */
  async getTodayStudyPlan(userId: string, wordbookId: string): Promise<DailyStudyPlan> {
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
      console.error('获取今日学习计划失败:', error);
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
   * 更新学习进度 - 使用云函数
   */
  async updateStudyProgress(
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
      console.error('更新学习进度失败:', error);
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