/**
 * CloudBase SDK 集成工具
 * 提供统一的云开发服务接口
 */

import cloudbase from '@cloudbase/js-sdk';
import { cloudbaseConfig, websocketConfig } from '../config/voiceConfig';

class CloudBaseHelper {
  constructor() {
    this.app = null;
    this.auth = null;
    this.db = null;
    this.functions = null;
    this.storage = null;
    
    this.isInitialized = false;
    this.isAuthenticated = false;
    
    // 事件回调
    this.onAuthStateChanged = null;
    this.onError = null;
  }
  
  /**
   * 初始化CloudBase
   */
  async initialize() {
    try {
      console.log('Initializing CloudBase...', {
        env: cloudbaseConfig.env
      });
      
      // 初始化CloudBase应用
      this.app = cloudbase.init({
        env: cloudbaseConfig.env,
        region: cloudbaseConfig.region
      });
      
      // 获取各种服务实例
      this.auth = this.app.auth();
      this.db = this.app.database();
      this.functions = this.app.functions();
      this.storage = this.app.storage();
      
      // 监听登录状态变化
      this.auth.onLoginStateChanged((loginState) => {
        console.log('Login state changed:', loginState);
        this.isAuthenticated = loginState?.isLoggedIn || false;
        
        if (this.onAuthStateChanged) {
          this.onAuthStateChanged(loginState);
        }
      });
      
      // 检查当前登录状态
      const loginState = await this.auth.getLoginState();
      this.isAuthenticated = loginState?.isLoggedIn || false;
      
      console.log('Current login state:', {
        isLoggedIn: this.isAuthenticated,
        loginType: loginState?.loginType
      });
      
      this.isInitialized = true;
      console.log('CloudBase initialized successfully');
      
      return true;
    } catch (error) {
      console.error('CloudBase initialization failed:', error);
      if (this.onError) {
        this.onError('CloudBase初始化失败: ' + error.message);
      }
      return false;
    }
  }
  
  /**
   * 登录认证
   */
  async authenticate(type = 'anonymous') {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      let result = null;
      
      switch (type) {
        case 'anonymous':
          // 匿名登录 - 适合语音助手使用
          result = await this.auth.signInAnonymously();
          console.log('Anonymous login successful:', result);
          break;
          
        case 'email':
          // 邮箱登录（需要用户交互）
          result = await this.auth.signInWithEmailAndPassword();
          break;
          
        case 'wechat':
          // 微信登录（需要在微信环境中）
          result = await this.auth.signInWithProvider('wechat');
          break;
          
        case 'default':
          // 跳转到默认登录页面
          await this.auth.toDefaultLoginPage();
          return { success: true, type: 'redirect' };
          
        default:
          throw new Error('不支持的登录类型: ' + type);
      }
      
      if (result && result.user) {
        this.isAuthenticated = true;
        console.log('Authentication successful:', {
          uid: result.user.uid,
          loginType: result.loginType
        });
        
        return { 
          success: true, 
          user: result.user,
          loginType: result.loginType
        };
      } else {
        throw new Error('登录结果异常');
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      if (this.onError) {
        this.onError('登录失败: ' + error.message);
      }
      return { success: false, error: error.message };
    }
  }
  
  /**
   * 登出
   */
  async signOut() {
    try {
      await this.auth.signOut();
      this.isAuthenticated = false;
      console.log('Sign out successful');
      return true;
    } catch (error) {
      console.error('Sign out failed:', error);
      return false;
    }
  }
  
  /**
   * 调用云函数
   */
  async callFunction(name, data = {}) {
    if (!this.isAuthenticated) {
      // 自动进行匿名登录
      const authResult = await this.authenticate('anonymous');
      if (!authResult.success) {
        throw new Error('未认证，且自动登录失败');
      }
    }
    
    try {
      console.log(`Calling cloud function: ${name}`, data);
      
      const result = await this.functions.callFunction({
        name: name,
        data: data
      });
      
      console.log(`Cloud function ${name} result:`, result);
      
      if (result.result) {
        return result.result;
      } else {
        throw new Error('云函数返回结果为空');
      }
    } catch (error) {
      console.error(`Cloud function ${name} failed:`, error);
      throw new Error(`云函数调用失败: ${error.message}`);
    }
  }
  
  /**
   * 获取语音助手WebSocket URL
   */
  getVoiceWebSocketUrl() {
    const baseUrl = websocketConfig.baseUrl;
    const endpoint = websocketConfig.voiceEndpoint;
    
    // 构建WebSocket URL
    let wsUrl = baseUrl;
    if (!wsUrl.endsWith('/')) {
      wsUrl += '/';
    }
    wsUrl += endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    
    console.log('Voice WebSocket URL:', wsUrl);
    return wsUrl;
  }
  
  /**
   * 保存对话记录到数据库
   */
  async saveConversation(conversationData) {
    if (!this.isAuthenticated) {
      console.warn('用户未登录，跳过对话记录保存');
      return null;
    }
    
    try {
      const collection = this.db.collection('conversations');
      
      const result = await collection.add({
        ...conversationData,
        userId: this.auth.currentUser?.uid,
        timestamp: new Date(),
        createdAt: this.db.serverDate()
      });
      
      console.log('Conversation saved:', result);
      return result;
    } catch (error) {
      console.error('Save conversation failed:', error);
      // 不抛出错误，避免影响主要功能
      return null;
    }
  }
  
  /**
   * 获取用户的对话历史
   */
  async getConversationHistory(limit = 50) {
    if (!this.isAuthenticated) {
      return [];
    }
    
    try {
      const collection = this.db.collection('conversations');
      
      const result = await collection
        .where({
          userId: this.auth.currentUser?.uid
        })
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
      
      console.log('Conversation history:', result.data.length, 'records');
      return result.data || [];
    } catch (error) {
      console.error('Get conversation history failed:', error);
      return [];
    }
  }
  
  /**
   * 保存学习统计数据
   */
  async saveStudyStats(statsData) {
    if (!this.isAuthenticated) {
      return null;
    }
    
    try {
      const collection = this.db.collection('study_stats');
      
      const result = await collection.add({
        ...statsData,
        userId: this.auth.currentUser?.uid,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD格式
        timestamp: new Date(),
        createdAt: this.db.serverDate()
      });
      
      console.log('Study stats saved:', result);
      return result;
    } catch (error) {
      console.error('Save study stats failed:', error);
      return null;
    }
  }
  
  /**
   * 获取用户学习统计
   */
  async getStudyStats(days = 7) {
    if (!this.isAuthenticated) {
      return [];
    }
    
    try {
      const collection = this.db.collection('study_stats');
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);
      
      const result = await collection
        .where({
          userId: this.auth.currentUser?.uid,
          date: this.db.command.gte(startDate.toISOString().split('T')[0])
        })
        .orderBy('date', 'desc')
        .get();
      
      console.log('Study stats:', result.data.length, 'records');
      return result.data || [];
    } catch (error) {
      console.error('Get study stats failed:', error);
      return [];
    }
  }
  
  /**
   * 上传音频文件到云存储
   */
  async uploadAudio(audioBlob, fileName) {
    if (!this.isAuthenticated) {
      const authResult = await this.authenticate('anonymous');
      if (!authResult.success) {
        throw new Error('上传文件需要登录');
      }
    }
    
    try {
      const cloudPath = `audio/${this.auth.currentUser?.uid}/${fileName}`;
      
      const result = await this.storage.uploadFile({
        cloudPath: cloudPath,
        filePath: audioBlob
      });
      
      console.log('Audio uploaded:', result);
      
      // 获取临时访问URL
      const tempUrl = await this.storage.getTempFileURL({
        fileList: [result.fileID]
      });
      
      return {
        fileId: result.fileID,
        cloudPath: cloudPath,
        tempUrl: tempUrl.fileList[0]?.tempFileURL
      };
    } catch (error) {
      console.error('Upload audio failed:', error);
      throw new Error('音频上传失败: ' + error.message);
    }
  }
  
  /**
   * 获取环境信息
   */
  async getEnvInfo() {
    try {
      // 调用环境查询云函数（如果有）
      const result = await this.callFunction('getEnvInfo');
      return result;
    } catch (error) {
      console.warn('Get env info failed:', error);
      return {
        env: cloudbaseConfig.env,
        region: cloudbaseConfig.region,
        timestamp: Date.now()
      };
    }
  }
  
  /**
   * 销毁资源
   */
  destroy() {
    console.log('Destroying CloudBase helper...');
    
    if (this.auth) {
      // 移除登录状态监听
      this.auth.onLoginStateChanged(null);
    }
    
    this.app = null;
    this.auth = null;
    this.db = null;
    this.functions = null;
    this.storage = null;
    
    this.isInitialized = false;
    this.isAuthenticated = false;
    
    console.log('CloudBase helper destroyed');
  }
}

// 创建单例实例
const cloudbaseHelper = new CloudBaseHelper();

export default cloudbaseHelper;
export { CloudBaseHelper };