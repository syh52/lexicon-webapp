/**
 * 帮助指南组件
 * 提供语音助手的使用说明、功能介绍和问题解答
 */

import React, { useState } from 'react';
import './HelpGuide.css';

const HelpGuide = ({ onClose }) => {
  const [activeSection, setActiveSection] = useState('getting-started');

  const sections = {
    'getting-started': {
      title: '快速开始',
      icon: '🚀',
      content: [
        {
          title: '第一次使用',
          steps: [
            '点击"开始对话"按钮启动语音助手',
            '允许浏览器访问您的麦克风权限',
            '等待系统初始化完成（显示"已连接"状态）',
            '开始说话，系统会自动识别您的语音'
          ]
        },
        {
          title: '基本操作',
          steps: [
            '🎤 点击麦克风按钮开始/停止录音',
            '🔊 AI回复会自动播放语音',
            '📊 查看实时音量和语音状态',
            '🗑️ 随时清除对话历史'
          ]
        },
        {
          title: '系统要求',
          steps: [
            '现代浏览器（Chrome 66+, Firefox 60+, Safari 11.1+）',
            '稳定的网络连接',
            '麦克风设备',
            '音频播放设备（耳机/扬声器）'
          ]
        }
      ]
    },
    'features': {
      title: '功能特色',
      icon: '⭐',
      content: [
        {
          title: '智能语音识别',
          description: '采用先进的ASR技术，支持英语语音的高精度识别',
          features: [
            '实时语音转文字',
            '支持不同口音和语速',
            '自动过滤背景噪音',
            '智能断句处理'
          ]
        },
        {
          title: 'AI英语教学',
          description: '专业的英语学习AI助手，提供个性化指导',
          features: [
            '语法错误纠正',
            '发音改进建议',
            '词汇使用优化',
            '口语流利度评估'
          ]
        },
        {
          title: '学习分析',
          description: '详细的学习数据分析和进度跟踪',
          features: [
            '实时语言质量分析',
            '学习进度统计',
            '技能评估报告',
            '个性化学习建议'
          ]
        },
        {
          title: '多场景对话',
          description: '支持多种英语学习场景和难度级别',
          features: [
            '日常对话练习',
            '商务英语场景',
            '学术讨论模式',
            '旅游英语对话'
          ]
        }
      ]
    },
    'settings': {
      title: '设置说明',
      icon: '⚙️',
      content: [
        {
          title: '用户级别设置',
          description: '根据您的英语水平选择合适的难度级别',
          options: [
            {
              level: '初级 (Beginner)',
              description: '适合英语基础较弱的学习者，使用简单词汇和短句'
            },
            {
              level: '中级 (Intermediate)', 
              description: '适合有一定基础的学习者，使用中等难度词汇'
            },
            {
              level: '高级 (Advanced)',
              description: '适合英语水平较高的学习者，可使用复杂表达'
            }
          ]
        },
        {
          title: '对话场景设置',
          description: '选择不同的对话场景来针对性练习',
          options: [
            {
              level: '日常对话',
              description: '生活话题、兴趣爱好、天气、新闻等日常交流'
            },
            {
              level: '商务英语',
              description: '工作场景、会议讨论、商务谈判、职场交流'
            },
            {
              level: '学术英语',
              description: '学术讨论、研究话题、论文写作、学术表达'
            },
            {
              level: '旅游英语',
              description: '旅行场景、酒店预订、问路导航、文化交流'
            }
          ]
        }
      ]
    },
    'tips': {
      title: '使用技巧',
      icon: '💡',
      content: [
        {
          title: '获得最佳体验的建议',
          tips: [
            '📍 在安静的环境中使用，减少背景噪音干扰',
            '🎯 说话时保持正常语速，不要过快或过慢',
            '📏 保持与麦克风适当的距离（15-20cm）',
            '🔄 如果识别有误，可以重新说一遍',
            '🎧 建议使用耳机避免回音问题'
          ]
        },
        {
          title: '提高学习效果的方法',
          tips: [
            '📚 每天坚持练习，保持学习连续性',
            '🎭 尝试不同的对话场景和话题',
            '📖 注意AI给出的语法和发音建议',
            '📊 定期查看学习进度和分析报告',
            '🔍 主动使用新学的词汇和表达方式'
          ]
        },
        {
          title: '常见问题解决',
          tips: [
            '❌ 如果语音识别不准确，请检查麦克风权限和网络连接',
            '🔇 如果没有声音，请检查音频播放设备和音量设置',
            '⚠️ 遇到错误提示时，尝试刷新页面或重新开始',
            '🌐 网络不稳定时，等待连接恢复再继续使用',
            '🔄 长时间无响应时，可以尝试重新初始化系统'
          ]
        }
      ]
    },
    'faq': {
      title: '常见问题',
      icon: '❓',
      content: [
        {
          title: '技术问题',
          faqs: [
            {
              question: '为什么无法访问麦克风？',
              answer: '请检查浏览器设置，确保已允许网站访问麦克风。在Chrome中，点击地址栏左侧的锁形图标，选择"允许"麦克风权限。'
            },
            {
              question: '语音识别准确率不高怎么办？',
              answer: '建议在安静环境中使用，说话清晰，语速适中。如果是口音问题，可以尝试使用更标准的发音，系统会逐渐适应您的语音特点。'
            },
            {
              question: '为什么有时候没有AI语音回复？',
              answer: '这可能是网络连接问题或服务器繁忙导致的。请检查网络连接，等待几秒钟后重试，或者刷新页面重新开始。'
            },
            {
              question: '支持哪些浏览器？',
              answer: '推荐使用最新版本的Chrome、Firefox、Safari或Edge浏览器。建议Chrome版本66+，Firefox版本60+，Safari版本11.1+。'
            }
          ]
        },
        {
          title: '功能使用',
          faqs: [
            {
              question: 'AI如何评估我的英语水平？',
              answer: 'AI会从语法准确性、词汇丰富度、发音清晰度、表达流利度等多个维度评估您的英语水平，并提供针对性的改进建议。'
            },
            {
              question: '学习数据会保存吗？',
              answer: '您的学习记录会安全保存在云端，包括对话历史、学习统计和进度分析。这些数据仅用于改进您的学习体验。'
            },
            {
              question: '可以离线使用吗？',
              answer: '语音助手需要网络连接才能正常工作，因为AI对话和语音处理都需要云端服务支持。请确保有稳定的网络连接。'
            },
            {
              question: '如何切换不同的学习场景？',
              answer: '点击页面右上角的设置按钮，在"对话场景"部分选择您想要练习的场景，如日常对话、商务英语等。'
            }
          ]
        }
      ]
    }
  };

  const renderContent = () => {
    const section = sections[activeSection];
    
    return (
      <div className="help-content">
        <div className="content-header">
          <h2 className="content-title">
            <span className="content-icon">{section.icon}</span>
            {section.title}
          </h2>
        </div>
        
        <div className="content-body">
          {section.content.map((item, index) => (
            <div key={index} className="content-section">
              <h3 className="section-subtitle">{item.title}</h3>
              
              {/* 步骤列表 */}
              {item.steps && (
                <ol className="steps-list">
                  {item.steps.map((step, stepIndex) => (
                    <li key={stepIndex} className="step-item">{step}</li>
                  ))}
                </ol>
              )}
              
              {/* 功能描述 */}
              {item.description && (
                <p className="feature-description">{item.description}</p>
              )}
              
              {/* 功能列表 */}
              {item.features && (
                <ul className="features-list">
                  {item.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="feature-item">
                      <span className="feature-bullet">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              )}
              
              {/* 选项列表 */}
              {item.options && (
                <div className="options-list">
                  {item.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="option-item">
                      <h4 className="option-title">{option.level}</h4>
                      <p className="option-description">{option.description}</p>
                    </div>
                  ))}
                </div>
              )}
              
              {/* 提示列表 */}
              {item.tips && (
                <ul className="tips-list">
                  {item.tips.map((tip, tipIndex) => (
                    <li key={tipIndex} className="tip-item">{tip}</li>
                  ))}
                </ul>
              )}
              
              {/* FAQ列表 */}
              {item.faqs && (
                <div className="faqs-list">
                  {item.faqs.map((faq, faqIndex) => (
                    <div key={faqIndex} className="faq-item">
                      <h4 className="faq-question">Q: {faq.question}</h4>
                      <p className="faq-answer">A: {faq.answer}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="help-guide">
      <div className="help-header">
        <h1 className="help-title">
          <span className="help-icon">📖</span>
          使用帮助
        </h1>
        <button className="help-close" onClick={onClose} aria-label="关闭帮助">
          ×
        </button>
      </div>
      
      <div className="help-body">
        {/* 侧边导航 */}
        <nav className="help-nav">
          {Object.entries(sections).map(([key, section]) => (
            <button
              key={key}
              className={`nav-item ${activeSection === key ? 'active' : ''}`}
              onClick={() => setActiveSection(key)}
            >
              <span className="nav-icon">{section.icon}</span>
              <span className="nav-text">{section.title}</span>
            </button>
          ))}
        </nav>
        
        {/* 主要内容 */}
        <main className="help-main">
          {renderContent()}
        </main>
      </div>
      
      <div className="help-footer">
        <div className="footer-info">
          <span className="footer-text">
            需要更多帮助？请联系技术支持或查看在线文档
          </span>
        </div>
        <div className="footer-actions">
          <button className="footer-button" onClick={onClose}>
            开始使用
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpGuide;