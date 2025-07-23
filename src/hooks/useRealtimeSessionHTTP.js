import { useCallback, useRef, useState, useEffect } from 'react';
import { app } from '../utils/cloudbase';

/**
 * useRealtimeSessionHTTP Hook - 基于HTTP的模拟实时对话
 * 由于中转API可能不支持WebSocket，使用HTTP请求模拟实时对话
 */
export function useRealtimeSessionHTTP(options = {}) {
  const {
    onConnectionChange,
    onError,
    onMessage,
    initialAgent = null
  } = options;

  const [status, setStatus] = useState('DISCONNECTED');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [currentAgent, setCurrentAgent] = useState(initialAgent);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isSilent, setIsSilent] = useState(true);

  /**
   * 更新连接状态
   */
  const updateStatus = useCallback((newStatus) => {
    console.log(`🔄 Status change: ${status} -> ${newStatus}`);
    setStatus(newStatus);
    setIsConnected(newStatus === 'CONNECTED');
    setIsConnecting(newStatus === 'CONNECTING');
    onConnectionChange?.(newStatus);
  }, [status, onConnectionChange]);

  /**
   * 处理错误
   */
  const handleError = useCallback((error) => {
    console.error('❌ HTTP session error:', error);
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    setError(errorMessage);
    setIsConnecting(false);
    onError?.(errorMessage);
  }, [onError]);

  /**
   * 连接到服务（模拟连接）
   */
  const connect = useCallback(async () => {
    if (isConnected || isConnecting) {
      console.log('⚠️ Already connected or connecting');
      return;
    }

    try {
      updateStatus('CONNECTING');
      setError(null);

      console.log('🔗 Connecting to chat API via HTTP...');

      // 测试API连通性
      const testResponse = await app.callFunction({
        name: 'realtime-proxy',
        data: { action: 'test_connection' }
      });

      if (!testResponse.result?.success) {
        throw new Error('无法连接到聊天API');
      }

      console.log('✅ API连接测试成功');

      // 设置简单的Agent配置
      const languageLearningAgent = {
        name: "language_tutor",
        description: "专业的英语学习助手",
        instructions: `你是一个专业的英语学习助手。你的任务是帮助用户提高英语水平。

特点：
- 友好、耐心、鼓励学习者
- 根据用户水平调整语言难度
- 提供实用的学习建议
- 纠正发音和语法错误
- 进行有意义的对话练习

请用自然、亲切的方式与用户交流，专注于帮助他们提高英语技能。`
      };

      setCurrentAgent(languageLearningAgent);
      updateStatus('CONNECTED');
      
      console.log('✅ Successfully connected to HTTP chat service');

    } catch (error) {
      console.error('❌ Failed to connect:', error);
      handleError(error);
      updateStatus('DISCONNECTED');
    }
  }, [isConnected, isConnecting, updateStatus, handleError]);

  /**
   * 断开连接
   */
  const disconnect = useCallback(async () => {
    try {
      console.log('🔌 Disconnecting from HTTP chat service...');
      
      setCurrentAgent(null);
      setError(null);
      updateStatus('DISCONNECTED');
      
      console.log('✅ Disconnected successfully');
    } catch (error) {
      console.error('❌ Error during disconnect:', error);
    }
  }, [updateStatus]);

  /**
   * 发送文本消息（使用标准的chat/completions API）
   */
  const sendUserText = useCallback(async (text) => {
    if (!isConnected) {
      throw new Error('Not connected to chat service');
    }
    
    console.log('📤 Sending user text:', text);
    
    try {
      // 添加用户消息到历史
      const userMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        text: text,
        timestamp: new Date()
      };
      
      setConversationHistory(prev => [...prev, userMessage]);
      
      // 构建对话历史
      const messages = [
        {
          role: 'system',
          content: currentAgent?.instructions || '你是一个有帮助的AI助手。'
        },
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.text
        })),
        {
          role: 'user',
          content: text
        }
      ];

      // 使用云函数代理发送请求
      const response = await app.callFunction({
        name: 'realtime-proxy',
        data: {
          action: 'chat_completion',
          messages: messages,
          model: 'gpt-3.5-turbo', // 使用可用的模型
          temperature: 0.7,
          max_tokens: 500
        }
      });

      if (!response.result?.success) {
        throw new Error(response.result?.error || 'Chat completion failed');
      }

      const assistantText = response.result.content;
      
      // 添加助手回复到历史
      const assistantMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        text: assistantText,
        timestamp: new Date()
      };
      
      setConversationHistory(prev => [...prev, assistantMessage]);
      
      // 触发消息回调
      onMessage?.({
        type: 'text_message',
        content: assistantText,
        role: 'assistant'
      });
      
      console.log('✅ Received assistant response:', assistantText);

    } catch (error) {
      console.error('❌ Failed to send message:', error);
      handleError(error);
    }
  }, [isConnected, currentAgent, conversationHistory, onMessage, handleError]);

  /**
   * 清除历史记录
   */
  const clearHistory = useCallback(() => {
    setConversationHistory([]);
    setError(null);
    console.log('🗑️ Conversation history cleared');
  }, []);

  /**
   * 中断当前响应（占位实现）
   */
  const interrupt = useCallback(() => {
    console.log('⏹️ Interrupt requested (HTTP mode)');
  }, []);

  /**
   * 静音/取消静音（占位实现）
   */
  const mute = useCallback((shouldMute) => {
    console.log(shouldMute ? '🔇 Muted (HTTP mode)' : '🔊 Unmuted (HTTP mode)');
  }, []);

  // 占位方法
  const sendAudioData = useCallback(() => {
    console.log('🎤 Audio not supported in HTTP mode');
  }, []);

  const pushToTalkStart = useCallback(() => {
    console.log('🎤 Push-to-talk not supported in HTTP mode');
  }, []);

  const pushToTalkStop = useCallback(() => {
    console.log('🎤 Push-to-talk not supported in HTTP mode');
  }, []);

  const switchAgent = useCallback(async (agentName) => {
    console.log('🔄 Agent switching not implemented in HTTP mode:', agentName);
  }, []);

  return {
    // 状态
    status,
    isConnected,
    isConnecting,
    error,
    currentAgent,
    conversationHistory,
    volumeLevel,
    isSilent,

    // 方法
    connect,
    disconnect,
    sendUserText,
    sendAudioData,
    mute,
    interrupt,
    clearHistory,
    pushToTalkStart,
    pushToTalkStop,
    switchAgent
  };
}