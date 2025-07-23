/**
 * OpenAI Realtime语音助手组件
 * 基于openai-realtime-agents项目，使用真实的WebRTC实现
 */
import React, { useState, useCallback } from 'react';
import { useRealtimeSessionWebSocket } from '../hooks/useRealtimeSessionWebSocket';
import AudioVisualizer from './AudioVisualizer';
import './RealtimeVoiceAssistant.css';

const RealtimeVoiceAssistant = () => {
  // 系统消息列表
  const [systemMessages, setSystemMessages] = useState([]);
  
  // 使用WebSocket版本的Realtime Session Hook
  const {
    status,
    isConnected,
    isConnecting,
    currentAgent,
    conversationHistory,
    error,
    volumeLevel,
    isSilent,
    connect,
    disconnect,
    sendUserText,
    clearHistory,
    mute,
    interrupt
  } = useRealtimeSessionWebSocket({
    onConnectionChange: (newStatus) => {
      console.log('🔄 Connection status changed:', newStatus);
      if (newStatus === 'CONNECTED') {
        addSystemMessage('🎉 已成功连接到AI语言学习助手！');
      } else if (newStatus === 'DISCONNECTED') {
        addSystemMessage('❌ 与AI助手的连接已断开');
      }
    },
    onError: (errorMessage) => {
      console.error('❌ Session error:', errorMessage);
      addSystemMessage(`❌ 连接错误：${errorMessage}`);
    },
    onAgentHandoff: (event) => {
      console.log('🔄 Agent handoff:', event);
      addSystemMessage('🔄 AI助手正在为您转接...');
    }
  });

  /**
   * 添加系统消息
   */
  const addSystemMessage = useCallback((text) => {
    const message = {
      id: Date.now(),
      type: 'system',
      text,
      timestamp: new Date()
    };
    setSystemMessages(prev => [...prev, message]);
    console.log('📢 System:', text);
  }, []);

  /**
   * 处理开始连接
   */
  const handleStartConversation = useCallback(async () => {
    try {
      if (!isConnected && !isConnecting) {
        addSystemMessage('🔗 正在连接到AI语言学习助手...');
        await connect();
      }
    } catch (error) {
      console.error('❌ Failed to start conversation:', error);
      addSystemMessage(`❌ 连接失败：${error.message}`);
    }
  }, [isConnected, isConnecting, connect, addSystemMessage]);

  /**
   * 处理断开连接
   */
  const handleDisconnect = useCallback(async () => {
    try {
      addSystemMessage('🔌 正在断开连接...');
      await disconnect();
    } catch (error) {
      console.error('❌ Failed to disconnect:', error);
    }
  }, [disconnect, addSystemMessage]);

  /**
   * 处理清除历史
   */
  const handleClearHistory = useCallback(() => {
    clearHistory();
    setSystemMessages([]);
    addSystemMessage('🗑️ 对话历史已清除');
  }, [clearHistory, addSystemMessage]);

  /**
   * 处理中断
   */
  const handleInterrupt = useCallback(() => {
    interrupt();
    addSystemMessage('⏹️ 已中断当前响应');
  }, [interrupt, addSystemMessage]);

  return (
    <div className="realtime-voice-assistant">
      {/* 头部 */}
      <div className="assistant-header">
        <h2 className="assistant-title">
          <span className="title-icon">🎤</span>
          AI语言学习助手
        </h2>
        <div className="connection-status">
          <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
          <span className="status-text">
            {isConnecting ? '连接中...' : isConnected ? '已连接' : '未连接'}
          </span>
          {currentAgent && (
            <span className="current-agent">
              {currentAgent.name || 'Language Tutor'}
            </span>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="error-banner">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
          </div>
        </div>
      )}

      {/* 音频可视化 */}
      <div className="visualizer-section">
        <AudioVisualizer
          volumeLevel={volumeLevel}
          isRecording={isConnected && !isSilent}
          isSilent={isSilent}
        />
      </div>

      {/* 主控制按钮 */}
      <div className="control-section">
        <button
          className={`record-button ${isConnected ? 'connected' : 'idle'} ${isConnecting ? 'loading' : ''}`}
          onClick={handleStartConversation}
          disabled={isConnecting}
          aria-label={isConnected ? '语音对话已激活' : '开始语音对话'}
        >
          <div className="record-button-inner">
            {isConnecting ? (
              <div className="loading-spinner"></div>
            ) : isConnected ? (
              <div className="connected-icon">🎤</div>
            ) : (
              <div className="connect-icon">🔗</div>
            )}
          </div>
          <span className="record-button-text">
            {isConnecting ? '连接中...' : isConnected ? '语音对话已激活' : '开始语音对话'}
          </span>
        </button>

        {/* 辅助控制 */}
        <div className="secondary-controls">
          {isConnected && (
            <>
              <button
                className="control-button"
                onClick={handleInterrupt}
                aria-label="中断当前响应"
              >
                <span className="control-icon">⏹️</span>
                中断
              </button>
              
              <button
                className="control-button"
                onClick={handleClearHistory}
                disabled={systemMessages.length === 0}
                aria-label="清除对话历史"
              >
                <span className="control-icon">🗑️</span>
                清除历史
              </button>

              <button
                className="control-button"
                onClick={handleDisconnect}
                aria-label="断开连接"
              >
                <span className="control-icon">🔌</span>
                断开连接
              </button>
            </>
          )}
        </div>
      </div>

      {/* 系统消息和对话历史 */}
      <div className="conversation-section">
        <div className="conversation-list">
          {/* 显示系统消息 */}
          {systemMessages.map((message) => (
            <div key={message.id} className="conversation-item system">
              <div className="conversation-avatar">ℹ️</div>
              <div className="conversation-content">
                <div className="conversation-text">{message.text}</div>
                <div className="conversation-time">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {/* 显示对话历史 */}
          {conversationHistory.map((conv) => (
            <div key={conv.id} className={`conversation-item ${conv.role}`}>
              <div className="conversation-avatar">
                {conv.role === 'user' && '👤'}
                {conv.role === 'assistant' && '🤖'}
              </div>
              <div className="conversation-content">
                <div className="conversation-text">{conv.text}</div>
                <div className="conversation-time">
                  {conv.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {/* 连接中指示器 */}
          {isConnecting && (
            <div className="conversation-item assistant processing">
              <div className="conversation-avatar">🤖</div>
              <div className="conversation-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 临时测试：文本输入 */}
      {isConnected && (
        <div className="test-input" style={{ marginTop: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h4>📝 测试文本对话</h4>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              placeholder="输入消息测试..." 
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  sendUserText(e.target.value.trim());
                  e.target.value = '';
                }
              }}
              style={{ 
                flex: 1, 
                padding: '8px', 
                border: '1px solid #ddd', 
                borderRadius: '4px' 
              }}
            />
            <button 
              onClick={() => {
                const input = document.querySelector('.test-input input');
                if (input.value.trim()) {
                  sendUserText(input.value.trim());
                  input.value = '';
                }
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              发送
            </button>
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="features-info">
        <div className="feature-card">
          <h3>🎤 实时语音</h3>
          <p>与AI进行自然语音对话</p>
        </div>
        <div className="feature-card">
          <h3>🧠 智能理解</h3>
          <p>准确理解语音内容</p>
        </div>
        <div className="feature-card">
          <h3>📚 语言学习</h3>
          <p>专业的英语学习指导</p>
        </div>
        <div className="feature-card">
          <h3>⚡ 低延迟</h3>
          <p>WebRTC技术保证流畅体验</p>
        </div>
      </div>
    </div>
  );
};

export default RealtimeVoiceAssistant;