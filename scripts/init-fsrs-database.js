/**
 * FSRS数据库初始化脚本
 * 创建必要的集合和索引
 */

const cloudbase = require('@cloudbase/node-sdk');

// 初始化云开发
const app = cloudbase.init({
  env: process.env.TCB_ENV || 'cloud1-7g7oatv381500c81'
});

const db = app.database();

async function initFSRSDatabase() {
  try {
    console.log('🚀 开始初始化FSRS数据库...');

    // 1. 创建单词卡片集合
    console.log('📝 创建cards集合...');
    await createCollection('cards');
    
    // 2. 创建学习记录集合
    console.log('📊 创建reviews集合...');
    await createCollection('reviews');
    
    // 3. 创建用户FSRS参数集合
    console.log('⚙️ 创建user_fsrs_params集合...');
    await createCollection('user_fsrs_params');
    
    // 4. 创建学习会话集合
    console.log('🎯 创建study_sessions集合...');
    await createCollection('study_sessions');
    
    // 5. 创建索引
    console.log('🔍 创建索引...');
    await createIndexes();
    
    // 6. 插入默认FSRS参数
    console.log('🎨 插入默认FSRS参数...');
    await insertDefaultFSRSParams();
    
    console.log('✅ FSRS数据库初始化完成！');
    
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    throw error;
  }
}

async function createCollection(collectionName) {
  try {
    const collection = db.collection(collectionName);
    // 尝试插入一个临时文档来创建集合
    const result = await collection.add({
      _temp: true,
      createdAt: new Date()
    });
    
    // 立即删除临时文档
    await collection.doc(result.id).remove();
    console.log(`  ✓ ${collectionName} 集合创建成功`);
  } catch (error) {
    console.log(`  ⚠️  ${collectionName} 集合可能已存在`);
  }
}

async function createIndexes() {
  try {
    // cards 集合索引
    await createIndex('cards', [
      { keys: { userId: 1, wordbookId: 1 } },
      { keys: { userId: 1, 'fsrs.due': 1 } },
      { keys: { userId: 1, 'fsrs.status': 1 } }
    ]);
    
    // reviews 集合索引
    await createIndex('reviews', [
      { keys: { userId: 1, cardId: 1, reviewTime: -1 } },
      { keys: { userId: 1, wordbookId: 1, reviewTime: -1 } },
      { keys: { userId: 1, reviewTime: -1 } }
    ]);
    
    // user_fsrs_params 集合索引
    await createIndex('user_fsrs_params', [
      { keys: { userId: 1, wordbookId: 1 } },
      { keys: { userId: 1 } }
    ]);
    
    // study_sessions 集合索引
    await createIndex('study_sessions', [
      { keys: { userId: 1, startTime: -1 } },
      { keys: { userId: 1, wordbookId: 1, startTime: -1 } }
    ]);
    
  } catch (error) {
    console.log('  ⚠️  索引创建可能失败，这通常是正常的');
  }
}

async function createIndex(collectionName, indexes) {
  for (const index of indexes) {
    try {
      // 云开发数据库索引通常通过控制台创建
      // 这里仅作为文档记录
      console.log(`  📋 ${collectionName} 需要创建索引:`, Object.keys(index.keys).join(', '));
    } catch (error) {
      console.log(`  ⚠️  ${collectionName} 索引创建失败`);
    }
  }
}

async function insertDefaultFSRSParams() {
  try {
    // 默认FSRS参数 (来自fsrs4anki)
    const defaultParams = {
      w: [0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542],
      requestRetention: 0.9,
      maximumInterval: 36500,
      optimized: false,
      metrics: {
        logLoss: 0,
        rmse: 0,
        accuracy: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // 检查是否已存在默认参数
    const existingParams = await db.collection('default_fsrs_params').get();
    
    if (!existingParams.data || existingParams.data.length === 0) {
      await db.collection('default_fsrs_params').add({
        name: 'global_default',
        description: '全局默认FSRS参数',
        ...defaultParams
      });
      console.log('  ✓ 默认FSRS参数插入成功');
    } else {
      console.log('  ⚠️  默认FSRS参数已存在');
    }
    
  } catch (error) {
    console.log('  ⚠️  默认参数插入失败:', error.message);
  }
}

// 导出初始化函数
module.exports = { initFSRSDatabase };

// 如果直接运行此脚本
if (require.main === module) {
  initFSRSDatabase()
    .then(() => {
      console.log('🎉 数据库初始化完成！');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 初始化失败:', error);
      process.exit(1);
    });
}