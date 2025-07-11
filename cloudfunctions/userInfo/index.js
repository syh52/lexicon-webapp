const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { action, userId, userInfo, email, displayName } = event;
  const { userRecord } = context;
  
  // 如果没有传userId，使用当前登录用户的uid
  const currentUserId = userId || userRecord?.uid;
  
  if (!currentUserId) {
    return {
      success: false,
      error: '用户未登录'
    };
  }
  
  try {
    switch (action) {
      case 'get':
        return await getUserInfo(currentUserId);
      
      case 'getOrCreate':
        // 获取或创建用户信息（用于登录时）
        return await getOrCreateUserInfo(currentUserId, { email, displayName });
      
      case 'init':
        // 初始化用户信息（用于注册时）
        return await createUserInfo(currentUserId, { email, displayName });
      
      case 'update':
        return await updateUserInfo(currentUserId, userInfo);
      
      case 'create':
        return await createUserInfo(currentUserId, userInfo);
        
      default:
        return {
          success: false,
          error: '未知操作类型'
        };
    }
  } catch (error) {
    console.error('UserInfo function error:', error);
    return {
      success: false,
      error: error.message || '服务器内部错误'
    };
  }
};

// 获取用户信息
async function getUserInfo(userId) {
  try {
    const userResult = await db.collection('users')
      .where({ uid: userId })
      .get();

    if (userResult.data.length === 0) {
      // 用户信息不存在，返回默认信息
      return {
        success: true,
        data: {
          uid: userId,
          displayName: '新用户',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
          level: 1,
          totalWords: 0,
          studiedWords: 0,
          correctRate: 0,
          streakDays: 0,
          lastStudyDate: null,
          isNewUser: true
        }
      };
    }

    const user = userResult.data[0];
    return {
      success: true,
      data: {
        uid: user.uid,
        displayName: user.displayName,
        avatar: user.avatar,
        level: user.level,
        totalWords: user.totalWords,
        studiedWords: user.studiedWords,
        correctRate: user.correctRate,
        streakDays: user.streakDays,
        lastStudyDate: user.lastStudyDate,
        isNewUser: false
      }
    };
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return {
      success: false,
      error: '获取用户信息失败：' + error.message
    };
  }
}

// 创建用户信息
async function createUserInfo(userId, userInfo = {}) {
  try {
    // 检查用户是否已存在
    const existingUser = await db.collection('users')
      .where({ uid: userId })
      .get();

    if (existingUser.data.length > 0) {
      return {
        success: false,
        error: '用户信息已存在'
      };
    }

    // 创建新用户信息
    const userData = {
      uid: userId,
      displayName: userInfo.displayName || userInfo.email?.split('@')[0] || '新用户',
      avatar: userInfo.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userInfo.email || userId}`,
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
      data: userData
    });

    if (result._id) {
      return {
        success: true,
        data: {
          ...userData,
          _id: result._id
        }
      };
    } else {
      return {
        success: false,
        error: '创建用户信息失败'
      };
    }
  } catch (error) {
    console.error('创建用户信息失败:', error);
    return {
      success: false,
      error: '创建用户信息失败：' + error.message
    };
  }
}

// 获取或创建用户信息
async function getOrCreateUserInfo(userId, userInfo = {}) {
  try {
    // 先尝试获取用户信息
    const userResult = await db.collection('users')
      .where({ uid: userId })
      .get();

    if (userResult.data.length > 0) {
      // 用户存在，返回用户信息
      const user = userResult.data[0];
      return {
        success: true,
        data: {
          uid: user.uid,
          displayName: user.displayName,
          avatar: user.avatar,
          level: user.level,
          totalWords: user.totalWords,
          studiedWords: user.studiedWords,
          correctRate: user.correctRate,
          streakDays: user.streakDays,
          lastStudyDate: user.lastStudyDate,
          isNewUser: false
        }
      };
    } else {
      // 用户不存在，创建新用户
      return await createUserInfo(userId, userInfo);
    }
  } catch (error) {
    console.error('获取或创建用户信息失败:', error);
    return {
      success: false,
      error: '获取或创建用户信息失败：' + error.message
    };
  }
}

// 更新用户信息
async function updateUserInfo(userId, userInfo) {
  try {
    if (!userInfo || Object.keys(userInfo).length === 0) {
      return {
        success: false,
        error: '更新信息不能为空'
      };
    }

    // 查找用户
    const userResult = await db.collection('users')
      .where({ uid: userId })
      .get();

    if (userResult.data.length === 0) {
      // 用户不存在，先创建
      return await createUserInfo(userId, userInfo);
    }

    const user = userResult.data[0];
    
    // 准备更新数据
    const updateData = {
      ...userInfo,
      updatedAt: db.serverDate()
    };

    // 移除不允许更新的字段
    delete updateData.uid;
    delete updateData._id;
    delete updateData.createdAt;

    // 更新用户信息
    const result = await db.collection('users')
      .doc(user._id)
      .update({
        data: updateData
      });

    if (result.stats.updated > 0) {
      // 返回更新后的用户信息
      const updatedUser = await db.collection('users')
        .doc(user._id)
        .get();
        
      return {
        success: true,
        data: updatedUser.data[0]
      };
    } else {
      return {
        success: false,
        error: '更新失败'
      };
    }
  } catch (error) {
    console.error('更新用户信息失败:', error);
    return {
      success: false,
      error: '更新用户信息失败：' + error.message
    };
  }
}