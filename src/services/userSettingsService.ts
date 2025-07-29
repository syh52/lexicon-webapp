import { getApp, ensureLogin } from '../utils/cloudbase';

// 用户设置接口
export interface UserSettings {
  _id?: string;
  userId: string;
  
  // 每日学习目标设置
  dailyNewWords: number;       // 每日新单词数量
  dailyReviewWords: number;    // 每日复习单词数量
  dailyTarget: number;         // 每日总目标
  
  // 学习偏好设置
  studyMode: 'standard' | 'intensive' | 'relaxed';
  enableVoice: boolean;        // 是否启用语音播放
  autoNext: boolean;           // 是否自动进入下一个单词
  
  // 提醒设置
  enableReminder: boolean;     // 是否启用学习提醒
  reminderTime: string;        // 提醒时间 (格式: "HH:MM")
  
  // 元数据
  createdAt?: Date;
  updatedAt?: Date;
}

// 默认用户设置
export const DEFAULT_USER_SETTINGS: Omit<UserSettings, 'userId'> = {
  // 每日学习目标 - 标准模式
  dailyNewWords: 16,
  dailyReviewWords: 48,
  dailyTarget: 64,
  
  // 学习偏好
  studyMode: 'standard',
  enableVoice: true,
  autoNext: false,
  
  // 提醒设置
  enableReminder: true,
  reminderTime: '19:00',
};

// 预设配置
export const PRESET_CONFIGS = {
  relaxed: {
    dailyNewWords: 8,
    dailyReviewWords: 24,
    dailyTarget: 32,
    studyMode: 'relaxed' as const,
    description: '轻松模式 - 适合初学者和时间较少的用户'
  },
  standard: {
    dailyNewWords: 16,
    dailyReviewWords: 48,
    dailyTarget: 64,
    studyMode: 'standard' as const,
    description: '标准模式 - 推荐的学习强度'
  },
  intensive: {
    dailyNewWords: 24,
    dailyReviewWords: 72,
    dailyTarget: 96,
    studyMode: 'intensive' as const,
    description: '强化模式 - 适合有充足时间的用户'
  }
};

export const userSettingsService = {
  /**
   * 获取用户设置
   */
  async getUserSettings(userId: string): Promise<UserSettings> {
    try {
      // 确保用户已登录CloudBase
      await ensureLogin();
      
      const appInstance = await getApp();
      const db = appInstance.database();
      const { data } = await db.collection('user_settings')
        .where({ userId })
        .get();
      
      if (data && data.length > 0) {
        const settings = data[0];
        return settings;
      } else {
        // 创建默认设置
        const defaultSettings: UserSettings = {
          userId,
          ...DEFAULT_USER_SETTINGS,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await db.collection('user_settings').add(defaultSettings);
        return defaultSettings;
      }
    } catch (error) {
      console.error('获取用户设置失败:', error);
      // 返回默认设置，避免阻塞用户使用
      return {
        userId,
        ...DEFAULT_USER_SETTINGS
      };
    }
  },

  /**
   * 更新用户设置
   */
  async updateUserSettings(userId: string, settings: Partial<UserSettings>): Promise<UserSettings> {
    try {
      // 确保用户已登录CloudBase
      await ensureLogin();
      
      const appInstance = await getApp();
      const db = appInstance.database();
      
      // 验证设置合理性
      const validatedSettings = this.validateSettings(settings);
      
      // 检查是否已存在设置
      const { data: existingSettings } = await db.collection('user_settings')
        .where({ userId })
        .get();
      
      const updateData = {
        ...validatedSettings,
        updatedAt: new Date()
      };
      
      if (existingSettings && existingSettings.length > 0) {
        // 更新现有设置
        const existingRecord = existingSettings[0];
        await db.collection('user_settings')
          .doc(existingRecord._id)
          .update(updateData);
        
        return { ...existingRecord, ...updateData };
      } else {
        // 创建新设置
        const newSettings: UserSettings = {
          userId,
          ...DEFAULT_USER_SETTINGS,
          ...validatedSettings,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await db.collection('user_settings').add(newSettings);
        return newSettings;
      }
    } catch (error) {
      console.error('更新用户设置失败:', error);
      throw error;
    }
  },

  /**
   * 应用预设配置
   */
  async applyPresetConfig(userId: string, presetName: keyof typeof PRESET_CONFIGS): Promise<UserSettings> {
    const presetConfig = PRESET_CONFIGS[presetName];
    if (!presetConfig) {
      throw new Error(`未找到预设配置: ${presetName}`);
    }
    
    const settingsToUpdate = {
      dailyNewWords: presetConfig.dailyNewWords,
      dailyReviewWords: presetConfig.dailyReviewWords,
      dailyTarget: presetConfig.dailyTarget,
      studyMode: presetConfig.studyMode
    };
    
    return await this.updateUserSettings(userId, settingsToUpdate);
  },

  /**
   * 验证设置合理性
   */
  validateSettings(settings: Partial<UserSettings>): Partial<UserSettings> {
    const validated = { ...settings };
    
    // 验证每日单词数量
    if (validated.dailyNewWords !== undefined) {
      validated.dailyNewWords = Math.max(1, Math.min(50, validated.dailyNewWords));
    }
    
    if (validated.dailyReviewWords !== undefined) {
      validated.dailyReviewWords = Math.max(0, Math.min(200, validated.dailyReviewWords));
    }
    
    // 自动计算总目标
    if (validated.dailyNewWords !== undefined || validated.dailyReviewWords !== undefined) {
      const newWords = validated.dailyNewWords || DEFAULT_USER_SETTINGS.dailyNewWords;
      const reviewWords = validated.dailyReviewWords || DEFAULT_USER_SETTINGS.dailyReviewWords;
      validated.dailyTarget = newWords + reviewWords;
    }
    
    // 验证提醒时间格式
    if (validated.reminderTime) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(validated.reminderTime)) {
        delete validated.reminderTime; // 无效时间格式，忽略
      }
    }
    
    return validated;
  },

  /**
   * 获取预设配置列表
   */
  getPresetConfigs() {
    return Object.entries(PRESET_CONFIGS).map(([key, config]) => ({
      key,
      ...config
    }));
  },

  /**
   * 检查是否已达到每日目标
   */
  async checkDailyTargetProgress(userId: string, completedCount: number): Promise<{
    isTargetReached: boolean;
    targetCount: number;
    progress: number;
  }> {
    try {
      // 确保用户已登录CloudBase
      await ensureLogin();
      
      const settings = await this.getUserSettings(userId);
      const isTargetReached = completedCount >= settings.dailyTarget;
      const progress = Math.min(100, (completedCount / settings.dailyTarget) * 100);
      
      return {
        isTargetReached,
        targetCount: settings.dailyTarget,
        progress
      };
    } catch (error) {
      console.error('检查每日目标进度失败:', error);
      return {
        isTargetReached: false,
        targetCount: DEFAULT_USER_SETTINGS.dailyTarget,
        progress: 0
      };
    }
  }
};

export default userSettingsService;