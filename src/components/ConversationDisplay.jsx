/**
 * 对话显示组件
 * 显示用户和AI助手的对话历史
 */

import React, { useEffect, useRef } from 'react';
import './ConversationDisplay.css';

const ConversationDisplay = ({ conversations = [], isProcessing = false }) => {
  const containerRef = useRef(null);
  
  // 自动滚动到底部
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [conversations, isProcessing]);
  
  // 格式化时间
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  // 渲染用户消息
  const renderUserMessage = (conversation) => (
    <div key={conversation.id} className="conversation-item user-message">
      <div className="message-header">
        <div className="message-avatar user-avatar">👤</div>
        <div className="message-meta">
          <span className="message-sender">您</span>
          <span className="message-time">{formatTime(conversation.timestamp)}</span>
        </div>
      </div>
      
      <div className="message-content">
        <div className="message-text">{conversation.text}</div>
        
        {/* 语言分析结果 */}
        {conversation.analysis && (
          <div className="message-analysis">
            <div className="analysis-header">
              <span className="analysis-icon">📊</span>
              <span className="analysis-title">语言分析</span>
            </div>
            
            <div className="analysis-content">
              {conversation.analysis.wordCount > 0 && (
                <div className="analysis-item">
                  <span className="analysis-label">词汇量:</span>
                  <span className="analysis-value">{conversation.analysis.wordCount}词</span>
                </div>
              )}
              
              {conversation.analysis.complexity && (
                <div className="analysis-item">
                  <span className="analysis-label">复杂度:</span>
                  <span className={`complexity-badge ${conversation.analysis.complexity}`}>
                    {conversation.analysis.complexity === 'beginner' ? '初级' : 
                     conversation.analysis.complexity === 'intermediate' ? '中级' : '高级'}
                  </span>
                </div>
              )}
              
              {conversation.analysis.strengths?.length > 0 && (
                <div className="analysis-strengths">
                  <span className="strengths-title">优点:</span>
                  {conversation.analysis.strengths.map((strength, index) => (
                    <span key={index} className="strength-tag">
                      ✅ {strength}
                    </span>
                  ))}
                </div>
              )}
              
              {conversation.analysis.suggestions?.length > 0 && (
                <div className="analysis-suggestions">
                  <span className="suggestions-title">建议:</span>
                  {conversation.analysis.suggestions.map((suggestion, index) => (
                    <span key={index} className="suggestion-tag">
                      💡 {suggestion}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
  
  // 渲染AI消息
  const renderAssistantMessage = (conversation) => (
    <div key={conversation.id} className="conversation-item assistant-message">
      <div className="message-header">
        <div className="message-avatar assistant-avatar">🤖</div>
        <div className="message-meta">
          <span className="message-sender">AI助手</span>
          <span className="message-time">{formatTime(conversation.timestamp)}</span>
        </div>
      </div>
      
      <div className="message-content">
        <div className="message-text">{conversation.text}</div>
        
        {/* AI响应元数据 */}
        {conversation.metadata && (
          <div className="message-metadata">
            <div className="metadata-item">
              <span className="metadata-icon">⏱️</span>
              <span className="metadata-text">
                处理时间: {((conversation.metadata.processingTime || 0) / 1000).toFixed(1)}s
              </span>
            </div>
            
            {conversation.metadata.tokensUsed && (
              <div className="metadata-item">
                <span className="metadata-icon">📝</span>
                <span className="metadata-text">
                  Token: {conversation.metadata.tokensUsed}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
  
  // 渲染处理中状态
  const renderProcessing = () => (
    <div className="conversation-item assistant-message processing">
      <div className="message-header">
        <div className="message-avatar assistant-avatar">🤖</div>
        <div className="message-meta">
          <span className="message-sender">AI助手</span>
          <span className="message-time">处理中...</span>
        </div>
      </div>
      
      <div className="message-content">
        <div className="processing-indicator">
          <div className="processing-dots">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
          <span className="processing-text">正在思考回复...</span>
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="conversation-display">
      <div className="conversation-header">
        <h3 className="conversation-title">
          <span className="title-icon">💬</span>
          对话记录
        </h3>
        {conversations.length > 0 && (
          <div className="conversation-stats">
            <span className="stats-text">
              共 {conversations.length} 条消息
            </span>
          </div>
        )}
      </div>
      
      <div ref={containerRef} className="conversation-container">
        {conversations.length === 0 && !isProcessing ? (
          <div className="empty-state">
            <div className="empty-icon">💭</div>
            <h4 className="empty-title">开始您的英语对话</h4>
            <p className="empty-description">
              点击下方的麦克风按钮，开始与AI助手进行英语口语练习。
              我会帮助您提高发音、语法和词汇使用。
            </p>
            <div className="empty-features">
              <div className="feature-item">
                <span className="feature-icon">🎯</span>
                <span className="feature-text">实时语音识别</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📚</span>
                <span className="feature-text">语法纠正</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🗣️</span>
                <span className="feature-text">发音指导</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">💡</span>
                <span className="feature-text">学习建议</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {conversations.map((conversation) => {
              if (conversation.type === 'user') {
                return renderUserMessage(conversation);
              } else if (conversation.type === 'assistant') {
                return renderAssistantMessage(conversation);
              }
              return null;
            })}
            
            {isProcessing && renderProcessing()}
          </>
        )}
      </div>
    </div>
  );
};

export default ConversationDisplay;