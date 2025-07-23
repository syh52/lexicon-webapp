/**
 * 语音助手主组件
 * 集成音频管理、可视化和对话界面
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import AudioManager from '../audio/AudioManager';
import AudioVisualizer from './AudioVisualizer';
import ConversationDisplay from './ConversationDisplay';
import './VoiceAssistant.css';

const VoiceAssistant = ({ 
  websocketUrl, 
  userLevel = 'intermediate',
  scenario = 'general',
  onError = null 
}) => {
  // 状态管理
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isSilent, setIsSilent] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  
  // 对话状态
  const [conversations, setConversations] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState('');
  
  // AudioManager实例
  const audioManagerRef = useRef(null);
  const initializingRef = useRef(false);
  
  // 初始化音频管理器
  const initializeAudioManager = useCallback(async () => {
    if (initializingRef.current || audioManagerRef.current?.isInitialized) {
      return;
    }
    
    try {
      initializingRef.current = true;
      setError('');
      
      console.log('Initializing VoiceAssistant...');
      
      // 创建AudioManager实例
      audioManagerRef.current = new AudioManager();
      
      // 设置事件回调
      audioManagerRef.current.onVolumeLevel = (volume, silent) => {
        setVolumeLevel(volume);
        setIsSilent(silent);
      };
      
      audioManagerRef.current.onRecordingState = (recording) => {
        setIsRecording(recording);
      };
      
      audioManagerRef.current.onError = (errorMessage) => {
        setError(errorMessage);
        if (onError) onError(errorMessage);
      };
      
      // 初始化音频系统
      const audioInitialized = await audioManagerRef.current.initialize();
      if (!audioInitialized) {
        throw new Error('音频系统初始化失败');
      }
      
      // 连接WebSocket
      if (websocketUrl) {
        const wsConnected = await audioManagerRef.current.connectWebSocket(websocketUrl);
        setIsConnected(wsConnected);
      }
      
      setIsInitialized(true);
      console.log('VoiceAssistant initialized successfully');
      
    } catch (error) {
      console.error('VoiceAssistant initialization failed:', error);
      setError(error.message);
      if (onError) onError(error.message);
    } finally {
      initializingRef.current = false;
    }
  }, [websocketUrl, onError]);
  
  // 开始录音
  const startRecording = useCallback(async () => {
    if (!audioManagerRef.current?.isInitialized) {
      await initializeAudioManager();
    }
    
    try {
      await audioManagerRef.current.startRecording();
      setCurrentTranscription('正在听取您的语音...');
      setIsProcessing(false);
    } catch (error) {
      console.error('Start recording failed:', error);
      setError('开始录音失败: ' + error.message);
    }
  }, [initializeAudioManager]);
  
  // 停止录音
  const stopRecording = useCallback(() => {
    if (audioManagerRef.current && isRecording) {
      audioManagerRef.current.stopRecording();
      setCurrentTranscription('正在处理语音...');
      setIsProcessing(true);
    }
  }, [isRecording]);
  
  // 切换录音状态
  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);
  
  // 处理WebSocket消息
  useEffect(() => {
    if (!audioManagerRef.current) return;
    
    // 重写WebSocket消息处理
    const originalHandler = audioManagerRef.current.handleWebSocketMessage.bind(audioManagerRef.current);
    
    audioManagerRef.current.handleWebSocketMessage = (event) => {
      try {
        // 处理二进制音频数据
        if (event.data instanceof ArrayBuffer) {
          originalHandler(event);
          return;
        }
        
        // 处理JSON消息
        const message = JSON.parse(event.data);
        console.log('Received message:', message);
        
        switch (message.type) {
          case 'transcription':
            setCurrentTranscription(message.text || '');
            setConversations(prev => [
              ...prev,
              {
                id: Date.now(),
                type: 'user',
                text: message.text,
                timestamp: new Date(),
                analysis: message.analysis
              }
            ]);
            break;
            
          case 'ai_response':
            setIsProcessing(false);
            setCurrentTranscription('');
            setConversations(prev => [
              ...prev,
              {
                id: Date.now() + 1,
                type: 'assistant',
                text: message.text,
                timestamp: new Date(),
                metadata: message.metadata
              }
            ]);
            
            // 播放AI回复音频
            if (message.audio) {
              audioManagerRef.current.playAudio(message.audio).catch(error => {
                console.error('Play AI audio failed:', error);
              });
            }
            break;
            
          case 'error':
            setIsProcessing(false);
            setCurrentTranscription('');
            setError('服务器错误: ' + message.error);
            break;
            
          default:
            originalHandler(event);
        }
      } catch (error) {
        console.error('Handle WebSocket message failed:', error);
        originalHandler(event);
      }
    };
  }, []);
  
  // 清除错误
  const clearError = useCallback(() => {
    setError('');
  }, []);
  
  // 清除对话历史
  const clearConversations = useCallback(() => {
    setConversations([]);
    setCurrentTranscription('');
  }, []);
  
  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      if (audioManagerRef.current) {
        audioManagerRef.current.destroy();
        audioManagerRef.current = null;
      }
    };
  }, []);
  
  // 自动初始化
  useEffect(() => {
    if (!isInitialized && !initializingRef.current) {
      initializeAudioManager();
    }
  }, [isInitialized, initializeAudioManager]);
  
  return (
    <div className="voice-assistant">
      <div className="assistant-header">
        <h2 className="assistant-title">
          <span className="title-icon">🎤</span>
          AI语音助手
        </h2>
        <div className="connection-status">
          <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
          <span className="status-text">
            {isConnected ? '已连接' : '未连接'}
          </span>
        </div>
      </div>
      
      {/* 错误提示 */}
      {error && (
        <div className="error-banner">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
            <button 
              className="error-close"
              onClick={clearError}
              aria-label="关闭错误提示"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      {/* 音频可视化 */}
      <div className="visualizer-section">
        <AudioVisualizer
          volumeLevel={volumeLevel}
          isRecording={isRecording}
          isSilent={isSilent}
        />
      </div>
      
      {/* 当前转录内容 */}
      {currentTranscription && (
        <div className="transcription-display">
          <div className={`transcription-content ${isProcessing ? 'processing' : ''}`}>
            {isProcessing && <div className="processing-spinner"></div>}
            <span className="transcription-text">{currentTranscription}</span>
          </div>
        </div>
      )}
      
      {/* 控制按钮 */}
      <div className="control-section">
        <button
          className={`record-button ${isRecording ? 'recording' : 'idle'}`}
          onClick={toggleRecording}
          disabled={!isInitialized || isProcessing}
          aria-label={isRecording ? '停止录音' : '开始录音'}
        >
          <div className="record-button-inner">
            {isRecording ? (
              <div className="stop-icon"></div>
            ) : (
              <div className="mic-icon">🎤</div>
            )}
          </div>
          <span className="record-button-text">
            {isRecording ? '停止录音' : '开始对话'}
          </span>
        </button>
        
        <div className="secondary-controls">
          <button
            className="control-button"
            onClick={clearConversations}
            disabled={conversations.length === 0}
            aria-label="清除对话历史"
          >
            <span className="control-icon">🗑️</span>
            清除历史
          </button>
          
          <div className="settings-info">
            <span className="setting-item">等级: {userLevel}</span>
            <span className="setting-item">场景: {scenario}</span>
          </div>
        </div>
      </div>
      
      {/* 对话历史 */}
      <div className="conversation-section">
        <ConversationDisplay
          conversations={conversations}
          isProcessing={isProcessing}
        />
      </div>
    </div>
  );
};

export default VoiceAssistant;