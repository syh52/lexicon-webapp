import React, { memo, useMemo, useCallback } from 'react';
import { StudyCard as StudyCardType, StudyProgress as StudyProgressType, StudyStatistics } from '../../types';

// 优化后的StudyCard组件
export const OptimizedStudyCard = memo(({ 
  card, 
  showAnswer, 
  onShowAnswer, 
  onRating, 
  current, 
  total, 
  onBack 
}: {
  card: StudyCardType;
  showAnswer: boolean;
  onShowAnswer: () => void;
  onRating: (isKnown: boolean) => void;
  current: number;
  total: number;
  onBack: () => void;
}) => {
  const progressPercentage = useMemo(() => {
    return Math.round(((current + 1) / total) * 100);
  }, [current, total]);

  const handleKnowClick = useCallback(() => {
    onRating(true);
  }, [onRating]);

  const handleDontKnowClick = useCallback(() => {
    onRating(false);
  }, [onRating]);

  const handleShowAnswer = useCallback(() => {
    onShowAnswer();
  }, [onShowAnswer]);

  return (
    <div className="study-card-container">
      {/* 基本的StudyCard布局 */}
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      
      <div className="card-content">
        <h2>{card.word}</h2>
        
        {showAnswer && (
          <div className="answer-content">
            <p>{card.meanings[0]?.definition}</p>
            {card.meanings[0]?.example && (
              <p className="example">{card.meanings[0].example}</p>
            )}
          </div>
        )}
        
        <div className="actions">
          {!showAnswer ? (
            <button onClick={handleShowAnswer}>Show Answer</button>
          ) : (
            <div className="rating-buttons">
              <button onClick={handleKnowClick}>Know</button>
              <button onClick={handleDontKnowClick}>Don't Know</button>
            </div>
          )}
        </div>
      </div>
      
      <div className="navigation">
        <button onClick={onBack}>Back</button>
        <span>{current + 1} / {total}</span>
      </div>
    </div>
  );
});

// 优化后的StudyProgress组件
export const OptimizedStudyProgress = memo(({ 
  current, 
  total, 
  stats 
}: {
  current: number;
  total: number;
  stats: StudyProgressType;
}) => {
  const progressPercentage = useMemo(() => {
    return Math.round((current / total) * 100);
  }, [current, total]);

  const accuracy = useMemo(() => {
    const total = stats.knownCount + stats.unknownCount;
    return total > 0 ? Math.round((stats.knownCount / total) * 100) : 0;
  }, [stats.knownCount, stats.unknownCount]);

  return (
    <div className="study-progress">
      <div className="progress-header">
        <h3>学习进度</h3>
        <span>{current}/{total}</span>
      </div>
      
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      
      <div className="stats">
        <div className="stat-item">
          <span className="stat-label">已学习</span>
          <span className="stat-value">{current}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">准确率</span>
          <span className="stat-value">{accuracy}%</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">学习时间</span>
          <span className="stat-value">{Math.round(stats.studyTime / 60)}分钟</span>
        </div>
      </div>
    </div>
  );
});

// 优化后的StudyStats组件
export const OptimizedStudyStats = memo(({ stats }: { stats: StudyStatistics }) => {
  const masteryRate = useMemo(() => {
    return stats.totalWords > 0 ? Math.round((stats.masteredWords / stats.totalWords) * 100) : 0;
  }, [stats.masteredWords, stats.totalWords]);

  const studyTimeFormatted = useMemo(() => {
    const hours = Math.floor(stats.totalStudyTime / 60);
    const minutes = stats.totalStudyTime % 60;
    return `${hours}小时${minutes}分钟`;
  }, [stats.totalStudyTime]);

  return (
    <div className="study-stats">
      <h3>学习统计</h3>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.totalWords}</div>
          <div className="stat-label">总单词数</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-number">{stats.studiedWords}</div>
          <div className="stat-label">已学习</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-number">{stats.masteredWords}</div>
          <div className="stat-label">已掌握</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-number">{masteryRate}%</div>
          <div className="stat-label">掌握率</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-number">{stats.accuracy}%</div>
          <div className="stat-label">准确率</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-number">{stats.studyStreak}</div>
          <div className="stat-label">连续学习</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-number">{studyTimeFormatted}</div>
          <div className="stat-label">学习时间</div>
        </div>
      </div>
    </div>
  );
});

// 优化后的WordCard组件
export const OptimizedWordCard = memo(({ 
  word, 
  onClick, 
  isSelected = false 
}: {
  word: StudyCardType;
  onClick: (word: StudyCardType) => void;
  isSelected?: boolean;
}) => {
  const handleClick = useCallback(() => {
    onClick(word);
  }, [onClick, word]);

  return (
    <div 
      className={`word-card ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
    >
      <h4>{word.word}</h4>
      <p>{word.meanings[0]?.definition}</p>
      <div className="word-meta">
        <span>{word.meanings[0]?.partOfSpeech}</span>
      </div>
    </div>
  );
});

// 优化后的WordList组件
export const OptimizedWordList = memo(({ 
  words, 
  onWordClick, 
  selectedWordId 
}: {
  words: StudyCardType[];
  onWordClick: (word: StudyCardType) => void;
  selectedWordId?: string;
}) => {
  const renderedWords = useMemo(() => {
    return words.map(word => (
      <OptimizedWordCard
        key={word._id}
        word={word}
        onClick={onWordClick}
        isSelected={selectedWordId === word._id}
      />
    ));
  }, [words, onWordClick, selectedWordId]);

  return (
    <div className="word-list">
      {renderedWords}
    </div>
  );
});

// 优化后的LoadingSpinner组件
export const OptimizedLoadingSpinner = memo(({ 
  size = 'medium', 
  text = '加载中...' 
}: {
  size?: 'small' | 'medium' | 'large';
  text?: string;
}) => {
  const spinnerClass = useMemo(() => {
    const baseClass = 'loading-spinner';
    return `${baseClass} ${baseClass}--${size}`;
  }, [size]);

  return (
    <div className="loading-container">
      <div className={spinnerClass} />
      <p>{text}</p>
    </div>
  );
});

// 优化后的ErrorBoundary组件
export const OptimizedErrorBoundary = memo(({ 
  error, 
  onRetry 
}: {
  error: Error;
  onRetry: () => void;
}) => {
  const handleRetry = useCallback(() => {
    onRetry();
  }, [onRetry]);

  return (
    <div className="error-boundary">
      <h3>出现错误</h3>
      <p>{error.message}</p>
      <button onClick={handleRetry}>重试</button>
    </div>
  );
});

// 导出所有优化组件
export {
  OptimizedStudyCard,
  OptimizedStudyProgress,
  OptimizedStudyStats,
  OptimizedWordCard,
  OptimizedWordList,
  OptimizedLoadingSpinner,
  OptimizedErrorBoundary,
};