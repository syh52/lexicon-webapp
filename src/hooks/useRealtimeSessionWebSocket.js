import { useCallback, useRef, useState, useEffect } from 'react';
import { app } from '../utils/cloudbase';

/**
 * useRealtimeSessionWebSocket Hook - 基于WebSocket的实时对话
 * 适配中转API的WebSocket连接方式，不需要ephemeral key
 */
export function useRealtimeSessionWebSocket(options = {}) {
  const {
    onConnectionChange,
    onError,
    onMessage,
    onAudioReceived,
    initialAgent = null
  } = options;

  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
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
    console.error('❌ WebSocket session error:', error);
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    setError(errorMessage);
    setIsConnecting(false);
    onError?.(errorMessage);
  }, [onError]);

  /**
   * 初始化音频上下文和麦克风
   */
  const initializeAudio = useCallback(async () => {
    try {
      console.log('🎤 Initializing audio...');
      
      // 创建音频上下文
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      
      // 获取麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      mediaStreamRef.current = stream;
      console.log('✅ Audio initialized successfully');
      return stream;
    } catch (error) {
      console.error('❌ Failed to initialize audio:', error);
      throw new Error(`麦克风初始化失败: ${error.message}`);
    }
  }, []);

  /**
   * 连接到WebSocket
   */
  const connect = useCallback(async () => {
    if (wsRef.current) {
      console.log('⚠️ Already connected or connecting');
      return;
    }

    try {
      updateStatus('CONNECTING');
      setError(null);

      // 初始化音频
      await initializeAudio();

      // 获取环境信息
      const envResponse = await app.callFunction({
        name: 'realtime-proxy',
        data: { action: 'test_connection' }
      });

      if (!envResponse.result?.success) {
        throw new Error('无法连接到中转API');
      }

      // 构建WebSocket URL - 根据文档尝试正确的端点
      // 从文档看，WebSocket端点应该是 wss://api.newapi.pro/v1/realtime
      // 但我们使用的是 chataiapi.com，需要确认正确的格式
      
      const baseUrl = envResponse.result.connection.baseURL || 'https://www.chataiapi.com/v1';
      console.log('🔍 Base URL from API:', baseUrl);
      
      // 尝试多种可能的WebSocket URL格式
      const possibleUrls = [
        // 标准格式 - 使用用户提供的正确模型
        baseUrl.replace('https://', 'wss://').replace('http://', 'ws://') + '/realtime?model=gpt-4o-realtime-preview',
        // 不带查询参数
        baseUrl.replace('https://', 'wss://').replace('http://', 'ws://') + '/realtime',
        // 直接使用域名
        'wss://www.chataiapi.com/v1/realtime',
        'wss://www.chataiapi.com/v1/realtime?model=gpt-4o-realtime-preview'
      ];
      
      console.log('🔍 Possible WebSocket URLs:', possibleUrls);
      
      // 先使用第一个URL
      const wsUrl = possibleUrls[0];
      
      console.log('🔗 Connecting to WebSocket:', wsUrl);

      // 创建WebSocket连接 - 先尝试简单的连接方式
      const apiKey = 'sk-MVwM0Y77CDZbTMT0cFoDe5WSZuYZk1G64dMWE6hpBitqgkgT';
      
      // 尝试不同的连接方式
      console.log('🔗 Attempting WebSocket connection...');
      console.log('🔗 URL:', wsUrl);
      
      // 根据文档使用正确的协议格式
      wsRef.current = new WebSocket(wsUrl, [
        "realtime",
        // 认证 - 使用文档中的正确格式
        "openai-insecure-api-key." + apiKey,
        // Beta协议，必需
        "openai-beta.realtime-v1"
      ]);
      
      console.log('✅ WebSocket created with protocols:', [
        "realtime",
        "openai-insecure-api-key." + apiKey,
        "openai-beta.realtime-v1"
      ]);

      // 设置事件监听器
      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connected');
        updateStatus('CONNECTED');
        
        // 发送会话配置
        const sessionConfig = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: `你是一个专业的英语学习助手。你的任务是帮助用户提高英语水平。

特点：
- 友好、耐心、鼓励学习者
- 根据用户水平调整语言难度
- 提供实用的学习建议
- 纠正发音和语法错误
- 进行有意义的对话练习

请用自然、亲切的方式与用户交流，专注于帮助他们提高英语技能。`,
            voice: 'nova',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            },
            temperature: 0.7,
            max_response_output_tokens: 'inf'
          }
        };
        
        wsRef.current.send(JSON.stringify(sessionConfig));
        console.log('📤 Sent session configuration');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📥 Received message:', message.type, message);
          
          // 处理不同类型的消息
          switch (message.type) {
            case 'session.updated':
              console.log('✅ Session updated:', message.session);
              break;
              
            case 'conversation.item.input_audio_transcription.completed':
              console.log('🎤 Input transcription:', message.transcript);
              setConversationHistory(prev => [...prev, {
                id: Date.now(),
                role: 'user',
                text: message.transcript,
                timestamp: new Date()
              }]);
              break;
              
            case 'response.text.delta':
              console.log('📝 Text delta:', message.delta);
              onMessage?.(message);
              break;
              
            case 'response.audio.delta':
              console.log('🔊 Audio delta received');
              onAudioReceived?.(message.delta);
              break;
              
            case 'response.text.done':
              console.log('✅ Response completed:', message.text);
              setConversationHistory(prev => [...prev, {
                id: Date.now(),
                role: 'assistant',
                text: message.text,
                timestamp: new Date()
              }]);
              break;
              
            case 'error':
              console.error('❌ Server error:', message.error);
              handleError(new Error(message.error.message));
              break;
              
            default:
              console.log('📋 Other message type:', message.type);
          }
        } catch (error) {
          console.error('❌ Failed to parse message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        console.error('❌ WebSocket URL was:', wsUrl);
        console.error('❌ WebSocket protocols were:', [
          'realtime',
          `openai-insecure-api-key.${apiKey}`,
          'openai-beta.realtime-v1'
        ]);
        handleError(new Error('WebSocket连接错误'));
      };

      wsRef.current.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        
        // 解释常见的关闭代码
        const closeReasons = {
          1000: 'Normal closure',
          1001: 'Going away',
          1002: 'Protocol error',
          1003: 'Unsupported data',
          1006: 'No status code',
          1007: 'Invalid data',
          1008: 'Policy violation',
          1009: 'Message too large',
          1010: 'Extension expected',
          1011: 'Server error',
          1015: 'TLS failure'
        };
        
        console.log('🔌 Close reason:', closeReasons[event.code] || 'Unknown');
        
        if (event.code !== 1000) {
          handleError(new Error(`WebSocket连接异常关闭: ${closeReasons[event.code] || event.code} - ${event.reason}`));
        }
        
        wsRef.current = null;
        updateStatus('DISCONNECTED');
        
        // 清理音频资源
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      };

    } catch (error) {
      console.error('❌ Failed to connect:', error);
      handleError(error);
      updateStatus('DISCONNECTED');
    }
  }, [updateStatus, handleError, initializeAudio, onMessage, onAudioReceived]);

  /**
   * 断开连接
   */
  const disconnect = useCallback(async () => {
    try {
      console.log('🔌 Disconnecting from WebSocket...');
      
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      // 清理音频资源
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      setCurrentAgent(null);
      setError(null);
      updateStatus('DISCONNECTED');
      
      console.log('✅ Disconnected successfully');
    } catch (error) {
      console.error('❌ Error during disconnect:', error);
    }
  }, [updateStatus]);

  /**
   * 发送文本消息
   */
  const sendUserText = useCallback((text) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    
    console.log('📤 Sending user text:', text);
    
    const message = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: text
          }
        ]
      }
    };
    
    wsRef.current.send(JSON.stringify(message));
    
    // 触发响应生成
    const responseCreate = {
      type: 'response.create'
    };
    
    wsRef.current.send(JSON.stringify(responseCreate));
  }, []);

  /**
   * 发送音频数据（占位实现）
   */
  const sendAudioData = useCallback((audioData) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    
    const message = {
      type: 'input_audio_buffer.append',
      audio: audioData // Base64编码的音频数据
    };
    
    wsRef.current.send(JSON.stringify(message));
  }, []);

  /**
   * 中断当前响应
   */
  const interrupt = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {
        type: 'response.cancel'
      };
      wsRef.current.send(JSON.stringify(message));
      console.log('⏹️ Interrupted current response');
    }
  }, []);

  /**
   * 清除历史记录
   */
  const clearHistory = useCallback(() => {
    setConversationHistory([]);
    setError(null);
    console.log('🗑️ Conversation history cleared');
  }, []);

  /**
   * 静音/取消静音（占位实现）
   */
  const mute = useCallback((shouldMute) => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !shouldMute;
      });
      console.log(shouldMute ? '🔇 Muted' : '🔊 Unmuted');
    }
  }, []);

  // 清理资源
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
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

    // 内部引用（用于调试）
    wsRef: wsRef.current
  };
}