/**
 * 学习进度组件
 * 展示用户的英语学习进度、统计数据和学习建议
 */

import React, { useState, useEffect } from 'react';
import cloudbaseHelper from '../utils/cloudbaseHelper';
import './LearningProgress.css';

const LearningProgress = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [studyData, setStudyData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState(7); // 默认显示7天

  useEffect(() => {
    loadStudyData();
  }, [dateRange]);

  /**
   * 加载学习数据
   */
  const loadStudyData = async () => {
    try {
      setLoading(true);

      // 获取学习统计
      const stats = await cloudbaseHelper.getStudyStats(dateRange);
      
      // 获取对话历史
      const conversations = await cloudbaseHelper.getConversationHistory(50);
      
      // 处理数据
      const processedData = processStudyData(stats, conversations);
      setStudyData(processedData);

    } catch (error) {
      console.error('Load study data failed:', error);
      // 使用模拟数据
      setStudyData(getMockStudyData());
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理学习数据
   */
  const processStudyData = (stats, conversations) => {
    // 计算总体统计
    const totalStats = {
      sessions: stats.length,
      totalTime: stats.reduce((sum, stat) => sum + (stat.duration || 0), 0),
      averageScore: stats.length > 0 
        ? stats.reduce((sum, stat) => sum + (stat.score || 0), 0) / stats.length 
        : 0,
      streak: calculateStreak(stats),
      improvement: calculateImprovement(stats)
    };

    // 按日期分组统计
    const dailyStats = groupStatsByDate(stats);
    
    // 技能分析
    const skillsAnalysis = analyzeSkills(conversations);
    
    // 词汇统计
    const vocabularyStats = analyzeVocabulary(conversations);
    
    // 学习建议
    const recommendations = generateRecommendations(totalStats, skillsAnalysis);

    return {
      total: totalStats,
      daily: dailyStats,
      skills: skillsAnalysis,
      vocabulary: vocabularyStats,
      recommendations: recommendations,
      recentConversations: conversations.slice(0, 10)
    };
  };

  /**
   * 计算连续学习天数
   */
  const calculateStreak = (stats) => {
    if (!stats || stats.length === 0) return 0;
    
    const dates = [...new Set(stats.map(s => s.date))].sort().reverse();
    let streak = 0;
    let currentDate = new Date();
    
    for (const date of dates) {
      const statDate = new Date(date);
      const diffDays = Math.floor((currentDate - statDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays === streak || (streak === 0 && diffDays === 0)) {
        streak++;
        currentDate = statDate;
      } else {
        break;
      }
    }
    
    return streak;
  };

  /**
   * 计算学习进步情况
   */
  const calculateImprovement = (stats) => {
    if (!stats || stats.length < 2) return 0;
    
    const recent = stats.slice(0, Math.ceil(stats.length / 2));
    const earlier = stats.slice(Math.ceil(stats.length / 2));
    
    const recentAvg = recent.reduce((sum, s) => sum + (s.score || 0), 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, s) => sum + (s.score || 0), 0) / earlier.length;
    
    return recentAvg - earlierAvg;
  };

  /**
   * 按日期分组统计
   */
  const groupStatsByDate = (stats) => {
    const grouped = {};
    
    stats.forEach(stat => {
      const date = stat.date || new Date().toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = {
          date,
          sessions: 0,
          totalTime: 0,
          averageScore: 0,
          scores: []
        };
      }
      
      grouped[date].sessions++;
      grouped[date].totalTime += stat.duration || 0;
      if (stat.score) {
        grouped[date].scores.push(stat.score);
      }
    });
    
    // 计算每日平均分数
    Object.values(grouped).forEach(day => {
      if (day.scores.length > 0) {
        day.averageScore = day.scores.reduce((sum, score) => sum + score, 0) / day.scores.length;
      }
    });
    
    return Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  /**
   * 分析技能水平
   */
  const analyzeSkills = (conversations) => {
    const skills = {
      pronunciation: { score: 0, count: 0, issues: [] },
      grammar: { score: 0, count: 0, issues: [] },
      vocabulary: { score: 0, count: 0, issues: [] },
      fluency: { score: 0, count: 0, issues: [] }
    };

    conversations.forEach(conv => {
      if (conv.type === 'user' && conv.analysis) {
        const analysis = conv.analysis;
        
        // 语法评估
        if (analysis.suggestions) {
          const grammarIssues = analysis.suggestions.filter(s => 
            s.includes('grammar') || s.includes('sentence') || s.includes('tense')
          );
          skills.grammar.count++;
          skills.grammar.score += Math.max(0, 100 - grammarIssues.length * 20);
          skills.grammar.issues.push(...grammarIssues);
        }
        
        // 词汇评估
        if (analysis.wordCount && analysis.complexity) {
          skills.vocabulary.count++;
          const complexityScore = analysis.complexity === 'advanced' ? 90 : 
                                  analysis.complexity === 'intermediate' ? 70 : 50;
          skills.vocabulary.score += complexityScore;
        }
        
        // 流利度评估
        if (analysis.wordCount) {
          skills.fluency.count++;
          const fluencyScore = Math.min(100, analysis.wordCount * 5);
          skills.fluency.score += fluencyScore;
        }
      }
    });

    // 计算平均分数
    Object.keys(skills).forEach(skill => {
      if (skills[skill].count > 0) {
        skills[skill].averageScore = skills[skill].score / skills[skill].count;
      } else {
        skills[skill].averageScore = 0;
      }
    });

    return skills;
  };

  /**
   * 分析词汇使用
   */
  const analyzeVocabulary = (conversations) => {
    const vocabulary = {
      totalWords: 0,
      uniqueWords: new Set(),
      complexWords: new Set(),
      commonErrors: {},
      improvements: []
    };

    conversations.forEach(conv => {
      if (conv.type === 'user') {
        const words = conv.text.toLowerCase().match(/\b\w+\b/g) || [];
        
        vocabulary.totalWords += words.length;
        words.forEach(word => {
          vocabulary.uniqueWords.add(word);
          
          // 识别复杂词汇（长度大于6）
          if (word.length > 6) {
            vocabulary.complexWords.add(word);
          }
        });

        // 分析错误和改进建议
        if (conv.analysis && conv.analysis.suggestions) {
          conv.analysis.suggestions.forEach(suggestion => {
            const key = suggestion.substring(0, 50); // 简化键
            vocabulary.commonErrors[key] = (vocabulary.commonErrors[key] || 0) + 1;
          });
        }

        if (conv.analysis && conv.analysis.strengths) {
          vocabulary.improvements.push(...conv.analysis.strengths);
        }
      }
    });

    return {
      ...vocabulary,
      uniqueWordsCount: vocabulary.uniqueWords.size,
      complexWordsCount: vocabulary.complexWords.size,
      vocabularyRichness: vocabulary.totalWords > 0 
        ? vocabulary.uniqueWords.size / vocabulary.totalWords 
        : 0
    };
  };

  /**
   * 生成学习建议
   */
  const generateRecommendations = (totalStats, skillsAnalysis) => {
    const recommendations = [];

    // 基于总体表现的建议
    if (totalStats.averageScore < 60) {
      recommendations.push({
        type: 'improvement',
        title: '加强基础练习',
        description: '建议多进行基础对话练习，重点关注语法和词汇',
        priority: 'high'
      });
    }

    if (totalStats.streak < 3) {
      recommendations.push({
        type: 'consistency',
        title: '保持学习连续性',
        description: '尝试每天至少练习10分钟，建立学习习惯',
        priority: 'medium'
      });
    }

    // 基于技能分析的建议
    Object.entries(skillsAnalysis).forEach(([skill, data]) => {
      if (data.averageScore < 70) {
        let title, description;
        
        switch (skill) {
          case 'grammar':
            title = '语法需要加强';
            description = '多练习时态变化和句型结构';
            break;
          case 'vocabulary':
            title = '扩展词汇量';
            description = '尝试使用更多高级词汇和表达方式';
            break;
          case 'pronunciation':
            title = '改善发音';
            description = '注意重读音节和语音语调';
            break;
          case 'fluency':
            title = '提高流利度';
            description = '多进行连续对话，减少停顿';
            break;
          default:
            return;
        }
        
        recommendations.push({
          type: 'skill',
          title,
          description,
          priority: data.averageScore < 50 ? 'high' : 'medium'
        });
      }
    });

    return recommendations;
  };

  /**
   * 获取模拟数据（用于演示）
   */
  const getMockStudyData = () => {
    return {
      total: {
        sessions: 15,
        totalTime: 3600, // 1小时
        averageScore: 75,
        streak: 5,
        improvement: 8.5
      },
      daily: [
        { date: '2025-01-20', sessions: 2, totalTime: 900, averageScore: 78 },
        { date: '2025-01-19', sessions: 1, totalTime: 600, averageScore: 72 },
        { date: '2025-01-18', sessions: 3, totalTime: 1200, averageScore: 80 }
      ],
      skills: {
        pronunciation: { averageScore: 70, count: 10 },
        grammar: { averageScore: 75, count: 12 },
        vocabulary: { averageScore: 80, count: 15 },
        fluency: { averageScore: 68, count: 8 }
      },
      vocabulary: {
        totalWords: 450,
        uniqueWordsCount: 180,
        complexWordsCount: 25,
        vocabularyRichness: 0.4
      },
      recommendations: [
        {
          type: 'skill',
          title: '提高流利度',
          description: '多进行连续对话，减少停顿',
          priority: 'medium'
        }
      ]
    };
  };

  /**
   * 格式化时长
   */
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    } else {
      return `${minutes}分钟`;
    }
  };

  /**
   * 获取技能颜色
   */
  const getSkillColor = (score) => {
    if (score >= 80) return '#10b981'; // 绿色
    if (score >= 60) return '#f59e0b'; // 黄色
    return '#ef4444'; // 红色
  };

  /**
   * 渲染概览标签页
   */
  const renderOverviewTab = () => {
    if (!studyData) return null;

    return (
      <div className="tab-content overview-tab">
        {/* 总体统计卡片 */}
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <span className="stat-value">{studyData.total.sessions}</span>
              <span className="stat-label">总会话数</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⏱️</div>
            <div className="stat-info">
              <span className="stat-value">{formatDuration(studyData.total.totalTime)}</span>
              <span className="stat-label">学习时长</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⭐</div>
            <div className="stat-info">
              <span className="stat-value">{studyData.total.averageScore.toFixed(1)}</span>
              <span className="stat-label">平均分数</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🔥</div>
            <div className="stat-info">
              <span className="stat-value">{studyData.total.streak}天</span>
              <span className="stat-label">连续学习</span>
            </div>
          </div>
        </div>

        {/* 技能评估 */}
        <div className="skills-section">
          <h3 className="section-title">技能评估</h3>
          <div className="skills-grid">
            {Object.entries(studyData.skills).map(([skill, data]) => (
              <div key={skill} className="skill-card">
                <div className="skill-header">
                  <span className="skill-name">
                    {skill === 'pronunciation' ? '发音' :
                     skill === 'grammar' ? '语法' :
                     skill === 'vocabulary' ? '词汇' : '流利度'}
                  </span>
                  <span 
                    className="skill-score"
                    style={{ color: getSkillColor(data.averageScore) }}
                  >
                    {data.averageScore.toFixed(0)}分
                  </span>
                </div>
                <div className="skill-progress">
                  <div 
                    className="skill-progress-fill"
                    style={{ 
                      width: `${data.averageScore}%`,
                      backgroundColor: getSkillColor(data.averageScore)
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 学习建议 */}
        <div className="recommendations-section">
          <h3 className="section-title">学习建议</h3>
          <div className="recommendations-list">
            {studyData.recommendations.map((rec, index) => (
              <div key={index} className={`recommendation-card ${rec.priority}`}>
                <div className="recommendation-icon">
                  {rec.type === 'improvement' ? '🎯' :
                   rec.type === 'consistency' ? '📅' : '💡'}
                </div>
                <div className="recommendation-content">
                  <h4 className="recommendation-title">{rec.title}</h4>
                  <p className="recommendation-description">{rec.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  /**
   * 渲染统计标签页
   */
  const renderStatsTab = () => {
    if (!studyData) return null;

    return (
      <div className="tab-content stats-tab">
        {/* 词汇统计 */}
        <div className="vocabulary-stats">
          <h3 className="section-title">词汇分析</h3>
          <div className="vocab-cards">
            <div className="vocab-card">
              <span className="vocab-number">{studyData.vocabulary.totalWords}</span>
              <span className="vocab-label">总词数</span>
            </div>
            <div className="vocab-card">
              <span className="vocab-number">{studyData.vocabulary.uniqueWordsCount}</span>
              <span className="vocab-label">独特词汇</span>
            </div>
            <div className="vocab-card">
              <span className="vocab-number">{studyData.vocabulary.complexWordsCount}</span>
              <span className="vocab-label">高级词汇</span>
            </div>
            <div className="vocab-card">
              <span className="vocab-number">{(studyData.vocabulary.vocabularyRichness * 100).toFixed(1)}%</span>
              <span className="vocab-label">词汇丰富度</span>
            </div>
          </div>
        </div>

        {/* 每日统计 */}
        <div className="daily-stats">
          <h3 className="section-title">最近学习记录</h3>
          <div className="daily-list">
            {studyData.daily.slice(0, 7).map((day, index) => (
              <div key={index} className="daily-item">
                <div className="daily-date">{new Date(day.date).toLocaleDateString()}</div>
                <div className="daily-info">
                  <span className="daily-sessions">{day.sessions}次会话</span>
                  <span className="daily-time">{formatDuration(day.totalTime)}</span>
                  <span className="daily-score">{day.averageScore.toFixed(0)}分</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="learning-progress loading">
        <div className="loading-spinner"></div>
        <p>正在加载学习数据...</p>
      </div>
    );
  }

  return (
    <div className="learning-progress">
      <div className="progress-header">
        <h2 className="progress-title">
          <span className="title-icon">📈</span>
          学习进度
        </h2>
        <div className="header-actions">
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="date-range-select"
          >
            <option value={7}>最近7天</option>
            <option value={30}>最近30天</option>
            <option value={90}>最近90天</option>
          </select>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
      </div>

      <div className="progress-tabs">
        <button 
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          概览
        </button>
        <button 
          className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          详细统计
        </button>
      </div>

      <div className="progress-content">
        {activeTab === 'overview' ? renderOverviewTab() : renderStatsTab()}
      </div>
    </div>
  );
};

export default LearningProgress;