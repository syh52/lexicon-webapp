import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { BookOpen, RefreshCw, CheckCircle } from 'lucide-react';

interface StudyProgressProps {
  current: number;
  total: number;
  newCards: number;
  reviewCards: number;
}

export function StudyProgress({ current, total, newCards, reviewCards }: StudyProgressProps) {
  const progressPercentage = total > 0 ? (current / total) * 100 : 0;
  const remaining = total - current;

  return (
    <Card className="glass-dark border-gray-700/50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">学习进度</h3>
          <div className="text-sm text-gray-400">
            {current} / {total}
          </div>
        </div>
        
        <Progress 
          value={progressPercentage} 
          className="mb-4 h-2"
        />
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mb-2">
              <BookOpen className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-sm text-gray-400">新单词</div>
            <div className="text-lg font-semibold text-white">{newCards}</div>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mb-2">
              <RefreshCw className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="text-sm text-gray-400">复习</div>
            <div className="text-lg font-semibold text-white">{reviewCards}</div>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-sm text-gray-400">剩余</div>
            <div className="text-lg font-semibold text-white">{remaining}</div>
          </div>
        </div>
        
        <div className="mt-4 text-center">
          <div className="text-sm text-gray-400">
            完成度 {progressPercentage.toFixed(1)}%
          </div>
        </div>
      </CardContent>
    </Card>
  );
}