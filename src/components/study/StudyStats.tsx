import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface StudyStatsProps {
  stats: {
    again: number;
    hard: number;
    good: number;
    easy: number;
  };
  totalCards: number;
  className?: string;
}

export function StudyStats({ stats, totalCards, className }: StudyStatsProps) {
  const correctAnswers = stats.hard + stats.good + stats.easy;
  const accuracy = totalCards > 0 ? (correctAnswers / totalCards) * 100 : 0;

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'again':
        return 'bg-red-500';
      case 'hard':
        return 'bg-orange-500';
      case 'good':
        return 'bg-green-500';
      case 'easy':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getRatingLabel = (rating: string) => {
    switch (rating) {
      case 'again':
        return '再来';
      case 'hard':
        return '困难';
      case 'good':
        return '良好';
      case 'easy':
        return '简单';
      default:
        return '';
    }
  };

  return (
    <Card className={cn('glass-dark border-gray-700/50', className)}>
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span>学习统计</span>
          <span className="text-sm font-normal text-gray-400">
            准确率: {accuracy.toFixed(1)}%
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 准确率进度条 */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">整体表现</span>
            <span className="text-sm text-white">{correctAnswers}/{totalCards}</span>
          </div>
          <Progress value={accuracy} className="h-2" />
        </div>
        
        {/* 评分分布 */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-400">评分分布</h4>
          
          {Object.entries(stats).map(([rating, count]) => {
            const percentage = totalCards > 0 ? (count / totalCards) * 100 : 0;
            
            return (
              <div key={rating} className="flex items-center space-x-3">
                <div className={cn(
                  'w-4 h-4 rounded-full',
                  getRatingColor(rating)
                )}></div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-white">
                      {getRatingLabel(rating)}
                    </span>
                    <span className="text-sm text-gray-400">
                      {count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={cn(
                        'h-2 rounded-full transition-all duration-300',
                        getRatingColor(rating)
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* 学习建议 */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-2">学习建议</h4>
          <div className="text-sm text-gray-300">
            {accuracy >= 90 && (
              <p>🎉 出色的表现！可以考虑增加学习量或挑战更难的词汇。</p>
            )}
            {accuracy >= 70 && accuracy < 90 && (
              <p>👍 不错的进步！继续保持这个节奏，注意复习困难的单词。</p>
            )}
            {accuracy >= 50 && accuracy < 70 && (
              <p>💪 需要加强练习，建议多复习几遍，掌握基础词汇。</p>
            )}
            {accuracy < 50 && (
              <p>🔄 建议降低学习难度，专注于基础词汇的掌握。</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}