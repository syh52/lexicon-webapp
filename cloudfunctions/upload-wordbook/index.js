const cloud = require('@cloudbase/node-sdk');

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV
});

const db = app.database();

exports.main = async (event, context) => {
  try {
    const { wordbookData, action, wordbookId } = event;

    // 处理不同的操作
    switch (action) {
      case 'delete':
        return await deleteWordbook(wordbookId);
      case 'getHistory':
        return await getUploadHistory();
      default:
        return await uploadWordbook(wordbookData);
    }
  } catch (error) {
    console.error('云函数执行错误:', error);
    return {
      success: false,
      error: error.message || '服务器内部错误'
    };
  }
};

// 上传词书
async function uploadWordbook(wordbookData) {
  if (!wordbookData || !wordbookData.name || !wordbookData.words) {
    return {
      success: false,
      error: '词书数据格式错误'
    };
  }

  const { name, description, words } = wordbookData;

  // 验证数据
  if (!Array.isArray(words) || words.length === 0) {
    return {
      success: false,
      error: '词书必须包含至少一个单词'
    };
  }

  // 验证单词数据
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!word.word || !word.meaning) {
      return {
        success: false,
        error: `第${i + 1}个单词数据不完整：缺少word或meaning字段`
      };
    }
  }

  try {
    // 生成唯一的词书ID
    const timestamp = Date.now();
    const wordbookId = `wordbook_${timestamp}`;

    // 创建词书记录
    const wordbook = {
      _id: wordbookId,
      name: name,
      description: description || `包含${words.length}个单词的词书`,
      cover: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop',
      totalCount: words.length,
      createdAt: new Date(),
      updatedAt: new Date(),
      uploadedAt: new Date()
    };

    // 准备单词数据
    const wordRecords = words.map((word, index) => ({
      _id: `${wordbookId}_word_${index + 1}`,
      wordbookId: wordbookId,
      word: word.word,
      phonetic: word.phonetic || '',
      meaning: word.meaning,
      example: word.example || '',
      pos: word.pos || '',
      audioUrl: word.audioUrl || `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word.word)}&type=1`,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // 直接插入数据，不使用事务（CloudBase的事务API较复杂）
    try {
      // 1. 插入词书记录
      await db.collection('wordbooks').add(wordbook);

      // 2. 批量插入单词记录
      const batchSize = 50; // 每批插入50条记录
      for (let i = 0; i < wordRecords.length; i += batchSize) {
        const batch = wordRecords.slice(i, i + batchSize);
        await db.collection('words').add(batch);
      }

      return {
        success: true,
        message: `词书「${name}」上传成功`,
        data: {
          wordbookId: wordbookId,
          wordCount: words.length
        }
      };
    } catch (error) {
      // 如果出错，尝试清理已创建的数据
      try {
        await db.collection('wordbooks').doc(wordbookId).remove();
        await db.collection('words').where({
          wordbookId: wordbookId
        }).remove();
      } catch (cleanupError) {
        console.error('清理失败的上传数据时出错:', cleanupError);
      }
      throw error;
    }
  } catch (error) {
    console.error('上传词书失败:', error);
    return {
      success: false,
      error: error.message || '上传失败'
    };
  }
}

// 删除词书
async function deleteWordbook(wordbookId) {
  if (!wordbookId) {
    return {
      success: false,
      error: '词书ID不能为空'
    };
  }

  try {
    // 直接删除数据，不使用事务
    // 1. 删除单词记录
    await db.collection('words').where({
      wordbookId: wordbookId
    }).remove();

    // 2. 删除词书记录
    await db.collection('wordbooks').doc(wordbookId).remove();

    // 3. 删除相关的学习记录（如果有）
    await db.collection('cards').where({
      wordbookId: wordbookId
    }).remove();

    return {
      success: true,
      message: '词书删除成功'
    };
  } catch (error) {
    console.error('删除词书失败:', error);
    return {
      success: false,
      error: error.message || '删除失败'
    };
  }
}

// 获取上传历史
async function getUploadHistory() {
  try {
    const result = await db.collection('wordbooks')
      .where({
        uploadedAt: db.command.exists(true)
      })
      .orderBy('uploadedAt', 'desc')
      .limit(50)
      .get();

    return {
      success: true,
      data: result.data || []
    };
  } catch (error) {
    console.error('获取上传历史失败:', error);
    return {
      success: false,
      error: error.message || '获取历史记录失败'
    };
  }
}