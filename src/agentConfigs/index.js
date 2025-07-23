/**
 * Agent配置统一入口
 * 管理所有学习场景的Agent配置
 */
import englishLearningAssistant from './vocabularyLearning/index.js';

/**
 * 所有可用的Agent场景配置
 */
export const allAgentSets = {
  // 综合英语学习助手（默认）
  default: [englishLearningAssistant],
  englishLearning: [englishLearningAssistant],
  
  // 可以添加更多学习场景
  // grammarFocus: grammarFocusScenario,
  // examPreparation: examPrepScenario,
  // businessEnglish: businessEnglishScenario
};

/**
 * 默认Agent场景
 */
export const defaultAgentSet = 'default';

/**
 * 根据学习目标获取推荐的Agent配置
 */
export function getRecommendedAgentSet(learningGoal, userLevel = 'intermediate') {
  // 现在只有一个综合性助手，适用于所有学习目标
  return defaultAgentSet;
}

/**
 * 获取Agent配置信息
 */
export function getAgentSetInfo(setName) {
  const agentSet = allAgentSets[setName];
  if (!agentSet) {
    return null;
  }

  return {
    name: setName,
    agents: agentSet.map(agent => ({
      name: agent.name,
      voice: agent.sessionConfig?.voice || agent.voice,
      description: agent.instructions.split('\n')[0]
    })),
    count: agentSet.length
  };
}

/**
 * 验证Agent配置
 */
export function validateAgentSet(setName) {
  const agentSet = allAgentSets[setName];
  if (!agentSet || !Array.isArray(agentSet) || agentSet.length === 0) {
    console.error(`Invalid agent set: ${setName}`);
    return false;
  }

  // 验证每个Agent的基本配置
  for (const agent of agentSet) {
    if (!agent.name || !agent.instructions) {
      console.error(`Invalid agent configuration in set ${setName}:`, agent);
      return false;
    }
  }

  return true;
}

export default {
  allAgentSets,
  defaultAgentSet,
  getRecommendedAgentSet,
  getAgentSetInfo,
  validateAgentSet
};