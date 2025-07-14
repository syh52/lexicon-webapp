import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { StudyCard } from '../components/study/StudyCard';
import { StudyProgress } from '../components/study/StudyProgress';
import { StudyStats } from '../components/study/StudyStats';
import { Button } from '../components/ui/button';
import { ArrowLeft, RotateCcw, Settings } from 'lucide-react';
import { FSRSScheduler, RATINGS, initNewCard, scheduleCard } from '../utils/fsrs';
import { sampleWords } from '../data/sampleWords';

interface StudySession {
  wordbookId: string;
  cards: any[];
  currentIndex: number;
  totalCards: number;
  completedCards: number;
  newCards: number;
  reviewCards: number;
  stats: {
    again: number;
    hard: number;
    good: number;
    easy: number;
  };
}

export default function StudyPage() {
  const { wordbookId } = useParams<{ wordbookId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<StudySession | null>(null);
  const [currentCard, setCurrentCard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [scheduler] = useState(new FSRSScheduler());

  useEffect(() => {
    if (wordbookId && user) {
      initializeStudySession();
    }
  }, [wordbookId, user]);

  const initializeStudySession = async () => {
    try {
      setIsLoading(true);
      
      // 暂时使用示例数据
      const cards = [...sampleWords];
      
      // 初始化学习会话
      const newSession: StudySession = {
        wordbookId: wordbookId!,
        cards: cards,
        currentIndex: 0,
        totalCards: cards.length,
        completedCards: 0,
        newCards: cards.filter(card => card.fsrs.status === 'new').length,
        reviewCards: cards.filter(card => card.fsrs.status === 'review').length,
        stats: {
          again: 0,
          hard: 0,
          good: 0,
          easy: 0
        }
      };
      
      setSession(newSession);
      setCurrentCard(cards[0] || null);
      
      if (cards.length === 0) {
        setIsFinished(true);
      }
    } catch (error) {
      console.error('初始化学习会话失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRating = async (rating: number) => {
    if (!currentCard || !session) return;
    
    try {
      // 使用FSRS算法更新卡片状态
      const updatedCard = scheduleCard(currentCard.fsrs, rating);
      
      // 更新本地状态
      const newStats = { ...session.stats };
      const ratingKey = Object.keys(RATINGS).find(key => RATINGS[key] === rating);
      if (ratingKey) {
        newStats[ratingKey]++;
      }
      
      const newSession = {
        ...session,
        currentIndex: session.currentIndex + 1,
        completedCards: session.completedCards + 1,
        stats: newStats
      };
      
      setSession(newSession);
      
      // 移动到下一张卡片
      if (newSession.currentIndex < session.cards.length) {
        const nextCard = session.cards[newSession.currentIndex];
        nextCard.studyStartTime = Date.now();
        setCurrentCard(nextCard);
        setShowAnswer(false);
      } else {
        setIsFinished(true);
      }
      
      console.log('卡片状态更新:', updatedCard);
    } catch (error) {
      console.error('处理评分失败:', error);
    }
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleRestartSession = () => {
    setIsFinished(false);
    initializeStudySession();
  };

  const handleBackToWordbooks = () => {
    navigate('/wordbooks');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xl text-white">准备学习材料...</span>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-8 bg-green-500/20 rounded-full flex items-center justify-center">
              <div className="text-4xl">🎉</div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">学习完成！</h1>
            <p className="text-gray-400 mb-8">
              恭喜你完成了今天的学习任务
            </p>
            
            {session && (
              <StudyStats 
                stats={session.stats}
                totalCards={session.completedCards}
                className="mb-8"
              />
            )}
            
            <div className="flex space-x-4 justify-center">
              <Button
                onClick={handleRestartSession}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                再来一轮
              </Button>
              <Button
                onClick={handleBackToWordbooks}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回词书
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* 头部导航 */}
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={handleBackToWordbooks}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 学习进度 */}
      {session && (
        <div className="max-w-4xl mx-auto px-4 py-4">
          <StudyProgress
            current={session.currentIndex}
            total={session.totalCards}
            newCards={session.newCards}
            reviewCards={session.reviewCards}
          />
        </div>
      )}

      {/* 学习卡片 */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {currentCard && (
          <StudyCard
            card={currentCard}
            showAnswer={showAnswer}
            onShowAnswer={handleShowAnswer}
            onRating={handleRating}
            scheduler={scheduler}
          />
        )}
      </div>
    </div>
  );
}