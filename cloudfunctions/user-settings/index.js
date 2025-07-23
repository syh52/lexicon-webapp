const cloudbase = require('@cloudbase/node-sdk');

// 初始化CloudBase
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});

const db = app.database();

// 默认用户设置
const DEFAULT_USER_SETTINGS = {
  dailyNewWords: 16,
  dailyReviewWords: 48,
  dailyTarget: 64,
  studyMode: 'standard',
  enableVoice: true,
  autoNext: false,
  enableReminder: true,
  reminderTime: '19:00',
};

// 预设配置
const PRESET_CONFIGS = {
  relaxed: {
    dailyNewWords: 8,
    dailyReviewWords: 24,
    dailyTarget: 32,
    studyMode: 'relaxed',
    description: '轻松模式 - 适合初学者和时间较少的用户'
  },
  standard: {
    dailyNewWords: 16,
    dailyReviewWords: 48,
    dailyTarget: 64,
    studyMode: 'standard',
    description: '标准模式 - 推荐的学习强度'
  },
  intensive: {
    dailyNewWords: 24,
    dailyReviewWords: 72,
    dailyTarget: 96,
    studyMode: 'intensive',
    description: '强化模式 - 适合有充足时间的用户'
  }
};

// 验证设置合理性
function validateSettings(settings) {
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
      delete validated.reminderTime;
    }
  }
  
  return validated;
}

exports.main = async (event, context) => {
  const { action, userId, settings, presetName } = event;
  
  try {
    switch (action) {
      case 'get':
        return await getUserSettings(userId);
      case 'update':
        return await updateUserSettings(userId, settings);
      case 'preset':
        return await applyPresetConfig(userId, presetName);
      case 'presets':
        return await getPresetConfigs();
      default:
        return {
          success: false,
          error: '无效的操作类型'
        };
    }
  } catch (error) {
    console.error('用户设置云函数错误:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 获取用户设置
async function getUserSettings(userId) {
  if (!userId) {
    throw new Error('用户ID不能为空');
  }
  
  const { data } = await db.collection('user_settings')
    .where({ userId })
    .get();
  
  if (data && data.length > 0) {
    return {
      success: true,
      data: data[0]
    };
  } else {
    // 创建默认设置
    const defaultSettings = {
      userId,
      ...DEFAULT_USER_SETTINGS,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('user_settings').add(defaultSettings);
    
    return {
      success: true,
      data: defaultSettings
    };
  }
}

// 更新用户设置
async function updateUserSettings(userId, settings) {
  if (!userId) {
    throw new Error('用户ID不能为空');
  }
  
  if (!settings || typeof settings !== 'object') {
    throw new Error('设置参数无效');
  }
  
  // 验证设置合理性
  const validatedSettings = validateSettings(settings);
  
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
    
    return {
      success: true,
      data: { ...existingRecord, ...updateData }
    };
  } else {
    // 创建新设置
    const newSettings = {
      userId,
      ...DEFAULT_USER_SETTINGS,
      ...validatedSettings,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('user_settings').add(newSettings);
    
    return {
      success: true,
      data: newSettings
    };
  }
}

// 应用预设配置
async function applyPresetConfig(userId, presetName) {
  if (!userId) {
    throw new Error('用户ID不能为空');
  }
  
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
  
  return await updateUserSettings(userId, settingsToUpdate);
}

// 获取预设配置列表
async function getPresetConfigs() {
  const configs = Object.entries(PRESET_CONFIGS).map(([key, config]) => ({
    key,
    ...config
  }));
  
  return {
    success: true,
    data: configs
  };
}