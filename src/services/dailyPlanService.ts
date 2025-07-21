import { app, ensureLogin } from '../utils/cloudbase';
import { DailyStudyPlan, DailyPlanGenerator } from './DailyPlanGenerator';
import { UserSettings, userSettingsService } from './userSettingsService';
import wordbookService from './wordbookService';

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
   * 获取或创建今日学习计划
   */
  async getTodayStudyPlan(userId: string, wordbookId: string): Promise<DailyStudyPlan> {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // 先尝试获取现有计划
      const existingPlan = await this.getDailyPlan(userId, wordbookId, today);
      if (existingPlan) {
        return existingPlan;
      }
      
      // 创建新的每日计划
      return await this.createDailyPlan(userId, wordbookId, today);
    } catch (error) {
      console.error('获取今日学习计划失败:', error);
      throw error;
    }
  },

  /**
   * 获取指定日期的学习计划
   */
  async getDailyPlan(userId: string, wordbookId: string, date: string): Promise<DailyStudyPlan | null> {
    try {
      // 确保用户已登录CloudBase
      await ensureLogin();
      
      const db = app.database();
      const { data } = await db.collection('daily_study_plans')
        .where({ userId, wordbookId, date })
        .get();
      
      if (data && data.length > 0) {
        return data[0];
      }
      
      return null;
    } catch (error) {
      console.error('获取每日计划失败:', error);
      return null;
    }
  },

  /**
   * 创建新的每日学习计划
   */
  async createDailyPlan(userId: string, wordbookId: string, date: string): Promise<DailyStudyPlan> {
    try {
      // 确保用户已登录CloudBase
      await ensureLogin();
      
      // 获取用户设置
      const userSettings = await userSettingsService.getUserSettings(userId);
      
      // 获取单词数据和学习记录
      const [wordsResult, studyRecords] = await Promise.all([
        app.callFunction({
          name: 'getWordsByWordbook',
          data: { wordbookId, limit: 1000 }
        }),
        wordbookService.getUserStudyRecords(userId, wordbookId)
      ]);
      
      if (!wordsResult.result?.success || !wordsResult.result?.data) {
        throw new Error('无法获取单词数据');
      }
      
      const words = wordsResult.result.data;
      
      // 生成学习计划
      const plan = DailyPlanGenerator.generateDailyPlan(
        userId,
        wordbookId,
        userSettings,
        words,
        studyRecords,
        date
      );
      
      // 保存到数据库
      const db = app.database();
      const { _id } = await db.collection('daily_study_plans').add(plan);
      
      return { ...plan, _id };
    } catch (error) {
      console.error('创建每日计划失败:', error);
      throw error;
    }
  },

  /**
   * 更新学习进度
   */
  async updateStudyProgress(
    userId: string,
    wordbookId: string,
    progressUpdate: StudyProgressUpdate
  ): Promise<DailyStudyPlan> {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // 确保用户已登录CloudBase
      await ensureLogin();
      
      // 获取当前计划
      const currentPlan = await this.getDailyPlan(userId, wordbookId, today);
      if (!currentPlan) {
        throw new Error('未找到今日学习计划');
      }
      
      // 更新计划进度
      const updatedPlan = DailyPlanGenerator.updatePlanProgress(
        currentPlan,
        progressUpdate.wordId,
        progressUpdate.isKnown,
        progressUpdate.studyTime || 0
      );
      
      // 保存到数据库（只更新必要字段提高性能）
      const db = app.database();
      const updateData = {
        completedWords: updatedPlan.completedWords,
        completedCount: updatedPlan.completedCount,
        currentIndex: updatedPlan.currentIndex,
        stats: updatedPlan.stats,
        isCompleted: updatedPlan.isCompleted,
        completedAt: updatedPlan.completedAt,
        updatedAt: new Date()
      };
      
      await db.collection('daily_study_plans')
        .doc(currentPlan._id)
        .update(updateData);
      
      return updatedPlan;
    } catch (error) {
      console.error('更新学习进度失败:', error);
      throw error;
    }
  },

  /**
   * 获取当前学习进度
   */
  async getCurrentProgress(userId: string, wordbookId: string): Promise<{
    plan: DailyStudyPlan | null;
    nextWord: string | null;
    progress: number;
    isCompleted: boolean;
  }> {
    try {
      const plan = await this.getTodayStudyPlan(userId, wordbookId);
      
      if (!plan) {
        return {
          plan: null,
          nextWord: null,
          progress: 0,
          isCompleted: false
        };
      }
      
      // 获取下一个要学习的单词
      const nextWord = plan.currentIndex < plan.plannedWords.length 
        ? plan.plannedWords[plan.currentIndex]
        : null;
      
      // 计算进度
      const progress = plan.totalCount > 0 
        ? (plan.completedCount / plan.totalCount) * 100
        : 0;
      
      return {
        plan,
        nextWord,
        progress,
        isCompleted: plan.isCompleted
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
   * 获取学习统计
   */
  async getStudyStats(userId: string, wordbookId: string, days: number = 7): Promise<DailyStats[]> {
    try {
      // 确保用户已登录CloudBase
      await ensureLogin();
      
      const db = app.database();
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      const { data } = await db.collection('daily_study_plans')
        .where({
          userId,
          wordbookId,
          date: db.command.gte(startDate.toISOString().split('T')[0])
        })
        .orderBy('date', 'desc')
        .get();
      
      const stats: DailyStats[] = (data || []).map(plan => ({
        date: plan.date,
        totalPlanned: plan.totalCount,
        totalCompleted: plan.completedCount,
        newWordsLearned: plan.completedWords.filter((wordId: string) => {
          const index = plan.plannedWords.indexOf(wordId);
          return index < plan.newWordsCount;
        }).length,
        reviewWordsCompleted: plan.completedWords.filter((wordId: string) => {
          const index = plan.plannedWords.indexOf(wordId);
          return index >= plan.newWordsCount;
        }).length,
        accuracy: plan.stats.accuracy,
        studyTime: plan.stats.studyTime,
        isTargetReached: plan.isCompleted
      }));
      
      return stats;
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