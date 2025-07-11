const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { action, data } = event;
  
  console.log('测试认证函数被调用:', action);
  console.log('传入数据:', data);
  
  try {
    switch (action) {
      case 'testUserGet':
        return await testUserGet(data.uid);
      case 'testUserCreate':
        return await testUserCreate(data);
      case 'testUserUpdate':
        return await testUserUpdate(data.uid, data.updateData);
      case 'listUsers':
        return await listUsers();
      default:
        return {
          success: false,
          error: '未知操作类型: ' + action
        };
    }
  } catch (error) {
    console.error('测试认证函数错误:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 获取用户信息
async function testUserGet(uid) {
  console.log('测试获取用户信息:', uid);
  
  const result = await db.collection('users')
    .where({ uid: uid })
    .get();
  
  return {
    success: true,
    action: 'testUserGet',
    data: result.data,
    count: result.data.length
  };
}

// 创建用户信息
async function testUserCreate(userData) {
  console.log('测试创建用户信息:', userData);
  
  // 检查用户是否已存在
  const existing = await db.collection('users')
    .where({ uid: userData.uid })
    .get();
  
  if (existing.data.length > 0) {
    return {
      success: false,
      error: '用户已存在',
      existing: existing.data[0]
    };
  }
  
  const newUser = {
    uid: userData.uid,
    email: userData.email || `test_${userData.uid}@example.com`,
    displayName: userData.displayName || '测试用户',
    avatar: userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.uid}`,
    level: 1,
    totalWords: 0,
    studiedWords: 0,
    correctRate: 0,
    streakDays: 0,
    lastStudyDate: null,
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  };
  
  const result = await db.collection('users').add({
    data: newUser
  });
  
  return {
    success: true,
    action: 'testUserCreate',
    data: {
      _id: result._id,
      ...newUser
    }
  };
}

// 更新用户信息
async function testUserUpdate(uid, updateData) {
  console.log('测试更新用户信息:', uid, updateData);
  
  const result = await db.collection('users')
    .where({ uid: uid })
    .update({
      data: {
        ...updateData,
        updatedAt: db.serverDate()
      }
    });
  
  return {
    success: true,
    action: 'testUserUpdate',
    updated: result.stats.updated,
    result: result
  };
}

// 列出所有用户
async function listUsers() {
  console.log('列出所有用户');
  
  const result = await db.collection('users')
    .limit(20)
    .get();
  
  return {
    success: true,
    action: 'listUsers',
    data: result.data,
    count: result.data.length
  };
}