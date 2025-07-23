/**
 * 词典查询云函数
 * 为Agent工具提供单词定义、发音、例句等信息
 */
const cloudbase = require('@cloudbase/node-sdk');

// 初始化CloudBase
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});

const db = app.database();

/**
 * 云函数主入口
 */
exports.main = async (event, context) => {
  console.log('Dictionary lookup function called:', JSON.stringify(event, null, 2));

  try {
    const { word, includePronunciation = true, includeExamples = true } = event;

    if (!word) {
      return {
        success: false,
        error: '缺少word参数'
      };
    }

    // 首先尝试从缓存数据库查询
    const cachedResult = await lookupFromCache(word);
    if (cachedResult) {
      console.log('Found word in cache:', word);
      return {
        success: true,
        ...cachedResult,
        fromCache: true
      };
    }

    // 如果缓存中没有，生成基础定义
    const result = await generateWordInfo(word, includePronunciation, includeExamples);

    // 保存到缓存
    try {
      await saveToCache(word, result);
    } catch (cacheError) {
      console.warn('Failed to save to cache:', cacheError);
    }

    return {
      success: true,
      ...result
    };

  } catch (error) {
    console.error('Dictionary lookup error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 从缓存数据库查询单词
 */
async function lookupFromCache(word) {
  try {
    const result = await db.collection('word_cache')
      .where({
        word: word.toLowerCase()
      })
      .limit(1)
      .get();

    if (result.data && result.data.length > 0) {
      const cached = result.data[0];
      return {
        definition: cached.definition,
        pronunciation: cached.pronunciation,
        examples: cached.examples || [],
        synonyms: cached.synonyms || [],
        difficulty: cached.difficulty || 'medium',
        partOfSpeech: cached.partOfSpeech || 'unknown'
      };
    }

    return null;
  } catch (error) {
    console.warn('Cache lookup failed:', error);
    return null;
  }
}

/**
 * 生成单词信息
 */
async function generateWordInfo(word, includePronunciation, includeExamples) {
  // 基础单词信息生成逻辑
  const basicInfo = {
    definition: `${word} - 英语单词，建议查阅权威词典获取详细释义。`,
    pronunciation: includePronunciation ? `/${word}/` : '',
    examples: includeExamples ? [
      `Here is an example with the word "${word}".`,
      `Please use "${word}" in a sentence.`
    ] : [],
    synonyms: [],
    difficulty: calculateDifficulty(word),
    partOfSpeech: 'unknown'
  };

  // 可以在这里集成真实的词典API
  // 比如 Oxford Dictionary API, Merriam-Webster API 等

  return basicInfo;
}

/**
 * 简单的难度评估
 */
function calculateDifficulty(word) {
  if (word.length <= 4) return 'easy';
  if (word.length <= 7) return 'medium';
  return 'hard';
}

/**
 * 保存到缓存
 */
async function saveToCache(word, wordInfo) {
  try {
    await db.collection('word_cache').add({
      word: word.toLowerCase(),
      ...wordInfo,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('Word saved to cache:', word);
  } catch (error) {
    console.error('Failed to save to cache:', error);
    throw error;
  }
}