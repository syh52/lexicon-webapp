import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, Eye, RotateCcw } from 'lucide-react';
import { RATINGS, getNextStates, getStudyAdvice } from '../../utils/fsrs';
import { motion, AnimatePresence } from 'framer-motion';

interface StudyCardProps {
  card: any;
  showAnswer: boolean;
  onShowAnswer: () => void;
  onRating: (rating: number) => void;
  scheduler: any;
}

export function StudyCard({ card, showAnswer, onShowAnswer, onRating, scheduler }: StudyCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyAdvice, setStudyAdvice] = useState<any>(null);

  useEffect(() => {
    if (card && card.fsrs) {
      try {
        const advice = getStudyAdvice(card.fsrs);
        setStudyAdvice(advice);
      } catch (error) {
        console.error('获取学习建议失败:', error);
        setStudyAdvice(null);
      }
    }
  }, [card]);

  useEffect(() => {
    setIsFlipped(showAnswer);
  }, [showAnswer]);

  const handlePlayAudio = () => {
    if (card.pronunciation) {
      // 使用Web Speech API播放发音
      const utterance = new SpeechSynthesisUtterance(card.word);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleRatingClick = (rating: number) => {
    onRating(rating);
    setIsFlipped(false);
  };

  const getRatingButtonStyle = (rating: number) => {
    const baseStyle = "flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95";
    
    switch (rating) {
      case RATINGS.again:
        return `${baseStyle} bg-red-600 hover:bg-red-700 text-white`;
      case RATINGS.hard:
        return `${baseStyle} bg-orange-600 hover:bg-orange-700 text-white`;
      case RATINGS.good:
        return `${baseStyle} bg-green-600 hover:bg-green-700 text-white`;
      case RATINGS.easy:
        return `${baseStyle} bg-blue-600 hover:bg-blue-700 text-white`;
      default:
        return baseStyle;
    }
  };

  const getRatingLabel = (rating: number) => {
    switch (rating) {
      case RATINGS.again:
        return '再来';
      case RATINGS.hard:
        return '困难';
      case RATINGS.good:
        return '良好';
      case RATINGS.easy:
        return '简单';
      default:
        return '';
    }
  };

  const getIntervalText = (days: number) => {
    if (days < 1) return '今天';
    if (days === 1) return '1天';
    if (days < 30) return `${days}天`;
    if (days < 365) return `${Math.round(days / 30)}个月`;
    return `${Math.round(days / 365)}年`;
  };

  return (
    <div className="relative">
      {/* 卡片状态指示器 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            card.fsrs.status === 'new' ? 'bg-blue-500' :
            card.fsrs.status === 'learning' ? 'bg-yellow-500' :
            card.fsrs.status === 'review' ? 'bg-green-500' :
            'bg-red-500'
          }`}></div>
          <span className="text-sm text-gray-400">
            {card.fsrs.status === 'new' ? '新单词' :
             card.fsrs.status === 'learning' ? '学习中' :
             card.fsrs.status === 'review' ? '复习' :
             '重新学习'}
          </span>
        </div>
        
        {studyAdvice && (
          <div className="text-sm text-gray-400">
            难度: {studyAdvice.difficulty}
            {studyAdvice.retrievability && (
              <span className="ml-2">
                记忆率: {studyAdvice.retrievability}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* 主卡片 */}
      <div className="relative h-96 mb-8 perspective-1000">
        <motion.div
          className="relative w-full h-full"
          initial={false}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* 正面 - 单词 */}
          <Card className="absolute inset-0 glass-dark border-gray-700/50 backface-hidden">
            <CardContent className="h-full flex flex-col items-center justify-center p-8">
              <div className="text-center">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                  {card.word}
                </h1>
                
                {card.pronunciation && (
                  <div className="flex items-center justify-center mb-6">
                    <span className="text-gray-400 mr-2">/{card.pronunciation}/</span>
                    <Button
                      onClick={handlePlayAudio}
                      variant="ghost"
                      size="sm"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Volume2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                
                <div className="text-gray-500 text-sm mb-8">
                  点击下方按钮查看释义
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 背面 - 释义 */}
          <Card className="absolute inset-0 glass-dark border-gray-700/50 backface-hidden rotate-y-180">
            <CardContent className="h-full flex flex-col justify-center p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-4">{card.word}</h2>
                
                {card.pronunciation && (
                  <div className="flex items-center justify-center mb-4">
                    <span className="text-gray-400 mr-2">/{card.pronunciation}/</span>
                    <Button
                      onClick={handlePlayAudio}
                      variant="ghost"
                      size="sm"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Volume2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                {card.meanings && card.meanings.map((meaning, index) => (
                  <div key={index} className="text-left">
                    <div className="flex items-start space-x-2">
                      <span className="text-blue-400 font-medium text-sm">
                        {meaning.partOfSpeech}
                      </span>
                      <span className="text-white flex-1">
                        {meaning.definition}
                      </span>
                    </div>
                    {meaning.example && (
                      <div className="mt-2 ml-12 text-gray-400 text-sm italic">
                        {meaning.example}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* 操作按钮 */}
      <div className="space-y-4">
        {!showAnswer ? (
          <Button
            onClick={onShowAnswer}
            className="w-full py-4 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          >
            <Eye className="w-5 h-5 mr-2" />
            查看释义
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="text-center text-gray-400 text-sm mb-4">
              根据你的记忆程度选择难度
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(RATINGS).map(([key, rating]) => (
                <Button
                  key={key}
                  onClick={() => handleRatingClick(rating)}
                  className={getRatingButtonStyle(rating)}
                >
                  <div className="text-center">
                    <div className="font-semibold">{getRatingLabel(rating)}</div>
                    {studyAdvice && studyAdvice.suggestions[key] && (
                      <div className="text-xs opacity-80 mt-1">
                        {getIntervalText(studyAdvice.suggestions[key].interval)}
                      </div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
            
            <div className="text-center text-xs text-gray-500 mt-4">
              再来=忘记了 • 困难=想起来但很困难 • 良好=正常想起 • 简单=很容易想起
            </div>
          </div>
        )}
      </div>
    </div>
  );
}