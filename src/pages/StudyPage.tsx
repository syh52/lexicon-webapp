import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { StudyCard } from '../components/study/StudyCard';
// @ts-ignore
import { 
  SimpleReviewScheduler, 
  DAILY_CONFIGS, 
  WORD_STATUS,
  processUserChoice
} from '../utils/simpleReviewAlgorithm.js';
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
    known: number;
    unknown: number;
  };
}

export default function StudyPage() {
  const { wordbookId } = useParams<{ wordbookId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<StudySession | null>(null);
  const [currentCard, setCurrentCard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [scheduler] = useState(new SimpleReviewScheduler(DAILY_CONFIGS.standard));

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
      
      // 使用新的简化算法获取今日学习队列
      const todayCards = scheduler.getDailyStudyQueue(words, studyRecords);
      
      console.log('获取今日学习队列完成，共', todayCards.length, '个卡片');
      
      // 转换为学习卡片格式
      const cards = todayCards.map((wordRecord: any) => {
        const originalWord = words.find((w: any) => w._id === wordRecord.wordId);
        
        return {
          _id: wordRecord.wordId,
          word: wordRecord.word,
          meanings: [{
            partOfSpeech: originalWord?.pos || 'n.',
            definition: originalWord?.meaning || 'No definition available',
            example: originalWord?.example || `Example with ${wordRecord.word}`
          }],
          pronunciation: originalWord?.phonetic || wordRecord.word,
          wordRecord: wordRecord,
          originalWord: originalWord
        };
      });
      
      // 统计新词和复习词
      const newWordsCount = cards.filter(card => card.wordRecord.status === WORD_STATUS.new).length;
      const reviewWordsCount = cards.length - newWordsCount;
      
      // 初始化学习会话
      const newSession: StudySession = {
        wordbookId: wordbookId!,
        cards: cards,
        currentIndex: 0,
        totalCards: cards.length,
        completedCards: 0,
        newCards: newWordsCount,
        reviewCards: reviewWordsCount,
        stats: {
          known: 0,
          unknown: 0
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

  const handleRating = async (isKnown: boolean) => {
    if (!currentCard || !session || !user) return;
    
    try {
      // 使用简化算法更新卡片状态
      const updatedWordRecord = processUserChoice(currentCard.wordRecord, isKnown);
      
      // 保存学习记录到CloudBase
      await wordbookService.saveStudyRecord({
        uid: user.uid,
        wordId: currentCard._id,
        wordbookId: session.wordbookId,
        stage: updatedWordRecord.stage,
        nextReview: updatedWordRecord.nextReview,
        failures: updatedWordRecord.failures,
        successes: updatedWordRecord.successes,
        lastReview: updatedWordRecord.lastReview,
        status: updatedWordRecord.status,
        createdAt: updatedWordRecord.createdAt
      });
      
      // 更新本地状态
      const newStats = { ...session.stats };
      if (isKnown) {
        newStats.known++;
      } else {
        newStats.unknown++;
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
        setCurrentCard(nextCard);
      } else {
        setIsFinished(true);
      }
      
      console.log('单词状态更新:', updatedWordRecord);
    } catch (error) {
      console.error('处理评分失败:', error);
    }
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
      <div className="flex flex-col items-center justify-center h-screen text-center space-y-6 px-6 bg-gray-900 text-white">
        <h2 className="text-2xl font-semibold tracking-tight">完成！</h2>
        <div className="text-lg text-gray-400 space-y-2">
          <p>今日学习完成</p>
          <p>
            认识：<span className="text-purple-400">{session?.stats.known || 0}</span> 个<br/>
            不认识：<span className="text-purple-400">{session?.stats.unknown || 0}</span> 个
          </p>
          <p className="text-sm text-gray-500">
            新词：{session?.newCards || 0} 个，复习：{session?.reviewCards || 0} 个
          </p>
        </div>
        <button 
          onClick={handleRestartSession}
          className="mt-4 px-6 py-3 rounded-lg text-white font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition"
        >
          再来一次
        </button>
      </div>
    );
  }

  return (
    <div>
      {currentCard && session && (
        <StudyCard
          card={currentCard}
          showAnswer={false}
          onShowAnswer={() => {}}
          onRating={handleRating}
          scheduler={scheduler}
          current={session.currentIndex}
          total={session.totalCards}
          onBack={handleBackToWordbooks}
        />
      )}
    </div>
  );
}