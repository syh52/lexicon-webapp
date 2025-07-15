import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { StudyCard } from '../components/study/StudyCard';
import { StudyProgress } from '../components/study/StudyProgress';
import { StudyStats } from '../components/study/StudyStats';
import { Button } from '../components/ui/button';
import { ArrowLeft, RotateCcw, Settings } from 'lucide-react';
// @ts-ignore
import { FSRSScheduler, RATINGS, initNewCard, scheduleCard } from '../utils/fsrs.js';
import wordbookService, { Word, StudyRecord } from '../services/wordbookService';
// @ts-ignore
import { app } from '../utils/cloudbase.js';

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
      
      if (!user || !wordbookId) {
        console.error('缺少用户或词书ID');
        return;
      }
      
      // 通过云函数获取真实的单词数据
      const result = await app.callFunction({
        name: 'getWordsByWordbook',
        data: { wordbookId }
      });
      
      console.log('云函数返回的单词数据:', result);
      
      if (!result.result?.success || !result.result?.data) {
        console.error('无法获取单词数据:', result.result?.error);
        setIsLoading(false);
        navigate('/wordbooks');
        return;
      }
      
      const words = result.result.data;
      
      if (words.length === 0) {
        console.warn('该词书没有单词数据');
        setIsLoading(false);
        navigate('/wordbooks');
        return;
      }
      
      const studyRecords = await wordbookService.getUserStudyRecords(user.uid, wordbookId);
      console.log('获取学习记录完成:', studyRecords);
      
      // 为每个单词创建学习卡片
      console.log('开始创建学习卡片...');
      const cards = words.map((word: any) => {
        const existingRecord = studyRecords.find(r => r.wordId === word._id);
        
        let fsrsData;
        if (existingRecord) {
          // 使用现有的学习记录
          fsrsData = {
            difficulty: existingRecord.difficulty,
            stability: existingRecord.stability,
            retrievability: existingRecord.retrievability,
            status: existingRecord.status,
            due: existingRecord.due,
            lapses: existingRecord.lapses,
            reps: existingRecord.reps,
            elapsedDays: existingRecord.elapsedDays,
            scheduledDays: existingRecord.scheduledDays
          };
        } else {
          // 新单词，使用FSRS初始化
          fsrsData = initNewCard();
        }
        
        return {
          _id: word._id,
          word: word.word,
          meanings: [{
            partOfSpeech: word.pos || 'n.',
            definition: word.meaning,
            example: word.example || `Example with ${word.word}`
          }],
          pronunciation: word.phonetic || word.word,
          fsrs: fsrsData,
          originalWord: word
        };
      });
      
      console.log('创建学习卡片完成，共', cards.length, '个卡片');
      
      // 初始化学习会话
      const newSession: StudySession = {
        wordbookId: wordbookId!,
        cards: cards,
        currentIndex: 0,
        totalCards: cards.length,
        completedCards: 0,
        newCards: cards.filter((card: any) => card.fsrs.status === 'new').length,
        reviewCards: cards.filter((card: any) => card.fsrs.status === 'review').length,
        stats: {
          again: 0,
          hard: 0,
          good: 0,
          easy: 0
        }
      };
      
      console.log('初始化学习会话:', newSession);
      
      setSession(newSession);
      setCurrentCard(cards[0] || null);
      
      if (cards.length === 0) {
        setIsFinished(true);
      }
      
      console.log('学习会话初始化完成');
      console.log('当前卡片:', cards[0]);
    } catch (error) {
      console.error('初始化学习会话失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRating = async (rating: number) => {
    if (!currentCard || !session || !user) return;
    
    try {
      // 使用FSRS算法更新卡片状态
      const updatedCard = scheduleCard(currentCard.fsrs, rating);
      
      // 保存学习记录到CloudBase
      await wordbookService.saveStudyRecord({
        uid: user.uid,
        wordId: currentCard._id,
        wordbookId: session.wordbookId,
        difficulty: updatedCard.difficulty,
        stability: updatedCard.stability,
        retrievability: updatedCard.retrievability,
        status: updatedCard.status,
        due: updatedCard.due,
        lapses: updatedCard.lapses,
        reps: updatedCard.reps,
        elapsedDays: updatedCard.elapsedDays,
        scheduledDays: updatedCard.scheduledDays,
        lastReviewed: new Date()
      });
      
      // 更新本地状态
      const newStats = { ...session.stats };
      const ratingKey = Object.keys(RATINGS).find(key => RATINGS[key] === rating);
      if (ratingKey && ratingKey in newStats) {
        (newStats as any)[ratingKey]++;
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