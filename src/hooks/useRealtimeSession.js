import { useCallback, useRef, useState, useEffect } from 'react';
import {
  RealtimeSession,
  OpenAIRealtimeWebRTC,
} from '@openai/agents/realtime';

import { audioFormatForCodec, applyCodecPreferences } from '../lib/codecUtils';
import { app } from '../utils/cloudbase';

/**
 * useRealtimeSession Hook - 基于openai-realtime-agents项目
 * 使用真实的OpenAI Agents库和WebRTC实现
 */
export function useRealtimeSession(options = {}) {
  const {
    onConnectionChange,
    onAgentHandoff,
    onError,
    initialAgent = null,
    audioElement = null
  } = options;

  const sessionRef = useRef(null);
  const audioElementRef = useRef(audioElement);
  const [status, setStatus] = useState('DISCONNECTED');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [currentAgent, setCurrentAgent] = useState(initialAgent);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isSilent, setIsSilent] = useState(true);

  const codecParamRef = useRef(
    (typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('codec') ?? 'opus')
      : 'opus')
      .toLowerCase(),
  );

  /**
   * 获取临时密钥
   */
  const getEphemeralKey = useCallback(async () => {
    try {
      console.log('🔑 Getting ephemeral key for Realtime API...');
      
      const response = await app.callFunction({
        name: 'realtime-proxy',
        data: {
          action: 'get_key',
          model: 'gpt-4o-realtime-preview-2024-12-17',
          voice: 'nova'
        }
      });

      if (!response.result?.success) {
        throw new Error(response.result?.error || 'Failed to get ephemeral key');
      }

      console.log('✅ Ephemeral key obtained successfully');
      return response.result.key;
    } catch (error) {
      console.error('❌ Failed to get ephemeral key:', error);
      throw error;
    }
  }, []);

  /**
   * 初始化音频元素
   */
  const initializeAudioElement = useCallback(() => {
    if (!audioElementRef.current) {
      audioElementRef.current = document.createElement('audio');
      audioElementRef.current.autoplay = true;
      audioElementRef.current.style.display = 'none';
      document.body.appendChild(audioElementRef.current);
    }
    return audioElementRef.current;
  }, []);

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
    console.error('❌ Realtime session error:', error);
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    setError(errorMessage);
    setIsConnecting(false);
    onError?.(errorMessage);
  }, [onError]);

  /**
   * 处理传输事件
   */
  const handleTransportEvent = useCallback((event) => {
    console.log('📡 Transport event:', event.type, event);
    
    // 处理转录事件
    switch (event.type) {
      case "conversation.item.input_audio_transcription.completed":
        console.log('🎤 Input transcription:', event.transcript);
        break;
      case "response.audio_transcript.done":
        console.log('🗣️ Output transcription:', event.transcript);
        break;
      case "response.audio_transcript.delta":
        // console.log('🗣️ Transcription delta:', event.delta);
        break;
      default:
        break;
    }
  }, []);

  /**
   * 处理Agent切换
   */
  const handleAgentHandoff = useCallback((event) => {
    console.log('🔄 Agent handoff:', event);
    if (event.agent) {
      setCurrentAgent(event.agent);
      onAgentHandoff?.(event);
    }
  }, [onAgentHandoff]);

  /**
   * 设置编解码器偏好
   */
  const applyCodec = useCallback((pc) => {
    try {
      applyCodecPreferences(pc, codecParamRef.current);
      return pc;
    } catch (error) {
      console.warn('⚠️ Failed to apply codec preferences:', error);
      return pc;
    }
  }, []);

  /**
   * 连接到Realtime API
   */
  const connect = useCallback(async () => {
    if (sessionRef.current) {
      console.log('⚠️ Already connected or connecting');
      return;
    }

    try {
      updateStatus('CONNECTING');
      setError(null);

      // 获取临时密钥
      const ephemeralKey = await getEphemeralKey();
      
      // 初始化音频元素
      const audioEl = initializeAudioElement();

      // 创建简单的语言学习Agent
      const languageLearningAgent = {
        name: "language_tutor",
        system_message: `你是一个专业的英语学习助手。你的任务是帮助用户提高英语水平。

特点：
- 友好、耐心、鼓励学习者
- 根据用户水平调整语言难度
- 提供实用的学习建议
- 纠正发音和语法错误
- 进行有意义的对话练习

请用自然、亲切的方式与用户交流，专注于帮助他们提高英语技能。`
      };

      // 设置音频格式
      const codecParam = codecParamRef.current;
      const audioFormat = audioFormatForCodec(codecParam);

      console.log('🚀 Creating RealtimeSession with agent:', languageLearningAgent.name);
      
      // 创建Realtime Session
      sessionRef.current = new RealtimeSession(languageLearningAgent, {
        transport: new OpenAIRealtimeWebRTC({
          audioElement: audioEl,
          // 设置WebRTC连接参数
          changePeerConnection: async (pc) => {
            return applyCodec(pc);
          },
        }),
        model: 'gpt-4o-realtime-preview-2024-12-17',
        config: {
          inputAudioFormat: audioFormat,
          outputAudioFormat: audioFormat,
          inputAudioTranscription: {
            model: 'whisper-1'
          },
          turnDetection: {
            type: 'server_vad',
            threshold: 0.5,
            prefixPaddingMs: 300,
            silenceDurationMs: 500
          },
          temperature: 0.7,
          maxResponseOutputTokens: 'inf'
        },
        outputGuardrails: [],
        context: {}
      });

      // 设置事件监听器
      sessionRef.current.on("error", handleError);
      sessionRef.current.on("agent_handoff", handleAgentHandoff);
      sessionRef.current.on("transport_event", handleTransportEvent);

      // 连接到API
      console.log('🔗 Connecting to OpenAI Realtime API...');
      await sessionRef.current.connect({ apiKey: ephemeralKey });
      
      setCurrentAgent(languageLearningAgent);
      updateStatus('CONNECTED');
      
      console.log('✅ Successfully connected to Realtime API');

    } catch (error) {
      console.error('❌ Failed to connect:', error);
      handleError(error);
      sessionRef.current = null;
      updateStatus('DISCONNECTED');
    }
  }, [getEphemeralKey, initializeAudioElement, applyCodec, updateStatus, handleError, handleAgentHandoff, handleTransportEvent]);

  /**
   * 断开连接
   */
  const disconnect = useCallback(async () => {
    try {
      console.log('🔌 Disconnecting from Realtime API...');
      
      if (sessionRef.current) {
        sessionRef.current.close();
        sessionRef.current = null;
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
   * 发送用户文本消息
   */
  const sendUserText = useCallback((text) => {
    if (!sessionRef.current) {
      throw new Error('Session not connected');
    }
    
    console.log('📤 Sending user text:', text);
    sessionRef.current.sendMessage(text);
  }, []);

  /**
   * 发送事件
   */
  const sendEvent = useCallback((event) => {
    if (!sessionRef.current) {
      throw new Error('Session not connected');
    }
    
    console.log('📤 Sending event:', event);
    sessionRef.current.transport.sendEvent(event);
  }, []);

  /**
   * 静音/取消静音
   */
  const mute = useCallback((shouldMute) => {
    if (sessionRef.current) {
      sessionRef.current.mute(shouldMute);
      console.log(shouldMute ? '🔇 Muted' : '🔊 Unmuted');
    }
  }, []);

  /**
   * 中断当前响应
   */
  const interrupt = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.interrupt();
      console.log('⏹️ Interrupted current response');
    }
  }, []);

  /**
   * 按键通话开始
   */
  const pushToTalkStart = useCallback(() => {
    if (!sessionRef.current) return;
    sessionRef.current.transport.sendEvent({ type: 'input_audio_buffer.clear' });
    console.log('🎤 Push-to-talk started');
  }, []);

  /**
   * 按键通话结束
   */
  const pushToTalkStop = useCallback(() => {
    if (!sessionRef.current) return;
    sessionRef.current.transport.sendEvent({ type: 'input_audio_buffer.commit' });
    sessionRef.current.transport.sendEvent({ type: 'response.create' });
    console.log('🎤 Push-to-talk stopped');
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
   * 切换Agent（简化实现）
   */
  const switchAgent = useCallback(async (agentName) => {
    console.log('🔄 Switching to agent:', agentName);
    // 对于简化版本，我们暂时不实现复杂的Agent切换
    // 可以在后续版本中添加
  }, []);

  // 清理资源
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.close();
      }
      if (audioElementRef.current && audioElementRef.current.parentNode) {
        audioElementRef.current.parentNode.removeChild(audioElementRef.current);
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
    sendEvent,
    mute,
    interrupt,
    pushToTalkStart,
    pushToTalkStop,
    clearHistory,
    switchAgent,

    // 内部引用（用于调试）
    sessionRef: sessionRef.current
  };
}