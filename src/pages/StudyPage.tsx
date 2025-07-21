import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { StudyCard } from '../components/study/StudyCard';
import { DailyStudyPlan } from '../services/DailyPlanGenerator';
import dailyPlanService from '../services/dailyPlanService';
import wordbookService, { Word, StudyRecord } from '../services/wordbookService';
import { processUserChoice, SimpleWordRecord } from '../utils/simpleReviewAlgorithm.js';
// @ts-ignore
import { app, ensureLogin } from '../utils/cloudbase.js';

interface StudySession {
  plan: DailyStudyPlan;
  cards: any[];
  currentCard: any;
  wordsMap: Map<string, any>;
  isCompleted: boolean;
}

export default function StudyPage() {
  const { wordbookId } = useParams<{ wordbookId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<StudySession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backgroundSaveQueue, setBackgroundSaveQueue] = useState<Array<{wordId: string, isKnown: boolean, timestamp: number}>>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
      
      const startTime = Date.now();
      
      // 获取或创建今日学习计划
      const todayPlan = await dailyPlanService.getTodayStudyPlan(user.uid, wordbookId);
      
      if (!todayPlan) {
        console.error('无法获取今日学习计划');
        setMessage({ type: 'error', text: '无法获取学习计划' });
        navigate('/wordbooks');
        return;
      }
      
      // 确保用户已登录CloudBase
      await ensureLogin();
      
      // 获取所有单词数据用于显示
      const wordsResult = await app.callFunction({
        name: 'getWordsByWordbook',
        data: { wordbookId, limit: 1000 }
      });
      
      if (!wordsResult.result?.success || !wordsResult.result?.data) {
        console.error('无法获取单词数据:', wordsResult.result?.error);
        setMessage({ type: 'error', text: '无法获取单词数据' });
        navigate('/wordbooks');
        return;
      }
      
      const words = wordsResult.result.data;
      
      // 创建单词查找映射
      const wordsMap = new Map(words.map((word: any) => [word._id, word]));
      
      // 构建学习卡片
      const cards = todayPlan.plannedWords.map((wordId: string) => {
        const originalWord = wordsMap.get(wordId);
        
        if (!originalWord) {
          return null;
        }
        
        return {
          _id: wordId,
          word: originalWord.word,
          meanings: [{
            partOfSpeech: originalWord.pos || 'n.',
            definition: originalWord.meaning || 'No definition available',
            example: originalWord.example || `Example with ${originalWord.word}`
          }],
          pronunciation: originalWord.phonetic || originalWord.word,
          originalWord: originalWord
        };
      }).filter(card => card !== null);
      
      // 获取当前要学习的卡片
      const currentCard = todayPlan.currentIndex < cards.length ? cards[todayPlan.currentIndex] : null;
      
      // 初始化学习会话
      const newSession: StudySession = {
        plan: todayPlan,
        cards,
        currentCard,
        wordsMap,
        isCompleted: todayPlan.isCompleted || todayPlan.currentIndex >= cards.length
      };
      
      const totalTime = Date.now() - startTime;
      setSession(newSession);
      
      if (newSession.isCompleted) {
        setMessage({ type: 'success', text: '今日学习目标已完成！' });
      }
      
    } catch (error) {
      console.error('初始化学习会话失败:', error);
      setMessage({ type: 'error', text: '初始化学习会话失败' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRating = async (isKnown: boolean) => {
    if (!session?.currentCard || !user) return;
    
    const currentCard = session.currentCard;
    const timestamp = Date.now();
    
    // 1. 立即更新本地UI状态（乐观更新）
    const updatedSession = {
      ...session,
      plan: {
        ...session.plan,
        completedWords: [...session.plan.completedWords, currentCard._id],
        completedCount: session.plan.completedCount + 1,
        currentIndex: Math.min(session.plan.currentIndex + 1, session.plan.totalCount - 1),
        stats: {
          ...session.plan.stats,
          knownCount: isKnown ? session.plan.stats.knownCount + 1 : session.plan.stats.knownCount,
          unknownCount: !isKnown ? session.plan.stats.unknownCount + 1 : session.plan.stats.unknownCount,
        }
      },
      currentCard: session.plan.currentIndex + 1 < session.cards.length 
        ? session.cards[session.plan.currentIndex + 1] 
        : null,
      isCompleted: session.plan.completedCount + 1 >= session.plan.totalCount
    };
    
    // 立即更新UI
    setSession(updatedSession);
    
    // 2. 将保存任务加入后台队列
    const saveTask = {
      wordId: currentCard._id,
      isKnown,
      timestamp
    };
    
    setBackgroundSaveQueue(prev => [...prev, saveTask]);
    
    // 3. 异步执行保存（不阻塞UI）
    backgroundSave(saveTask, currentCard);
    
    // 显示完成时的成功消息
    if (updatedSession.isCompleted) {
      setMessage({ 
        type: 'success', 
        text: `🎉 恭喜！今日学习目标已完成 (${updatedSession.plan.completedCount}/${updatedSession.plan.totalCount})` 
      });
    }
    
    };
  
  // 后台保存函数
  const backgroundSave = async (saveTask: {wordId: string, isKnown: boolean, timestamp: number}, card: any) => {
    try {
      // 获取学习记录并处理
      const studyRecords = await wordbookService.getUserStudyRecords(user!.uid, wordbookId!);
      const currentWordRecord = studyRecords.find(record => record.wordId === card._id);
      
      let updatedWordRecord;
      if (currentWordRecord) {
        const wordRecord = new SimpleWordRecord(card._id, card.word);
        wordRecord.stage = currentWordRecord.stage || 0;
        wordRecord.nextReview = new Date(currentWordRecord.nextReview || Date.now());
        wordRecord.failures = currentWordRecord.failures || 0;
        wordRecord.successes = currentWordRecord.successes || 0;
        wordRecord.lastReview = currentWordRecord.lastReview ? new Date(currentWordRecord.lastReview) : null;
        wordRecord.status = currentWordRecord.status || 'new';
        wordRecord.createdAt = currentWordRecord.createdAt ? new Date(currentWordRecord.createdAt) : new Date();
        updatedWordRecord = processUserChoice(wordRecord, saveTask.isKnown);
      } else {
        const wordRecord = new SimpleWordRecord(card._id, card.word);
        updatedWordRecord = processUserChoice(wordRecord, saveTask.isKnown);
      }
      
      // 并行保存学习记录和更新进度
      await Promise.all([
        wordbookService.saveStudyRecord({
          uid: user!.uid,
          wordId: card._id,
          wordbookId: wordbookId!,
          stage: updatedWordRecord.stage,
          nextReview: updatedWordRecord.nextReview,
          failures: updatedWordRecord.failures,
          successes: updatedWordRecord.successes,
          lastReview: updatedWordRecord.lastReview,
          status: updatedWordRecord.status,
          createdAt: updatedWordRecord.createdAt
        }),
        dailyPlanService.updateStudyProgress(user!.uid, wordbookId!, {
          wordId: card._id,
          isKnown: saveTask.isKnown,
          studyTime: Date.now() - saveTask.timestamp,
          timestamp: new Date()
        })
      ]);
      
      // 从队列中移除成功的任务
      setBackgroundSaveQueue(prev => prev.filter(task => 
        task.wordId !== saveTask.wordId || task.timestamp !== saveTask.timestamp
      ));
      
      } catch (error) {
      console.error('后台保存失败:', error);
      // 静默失败，不影响用户体验
      // 可以在这里实现重试逻辑
      setBackgroundSaveQueue(prev => prev.filter(task => 
        task.wordId !== saveTask.wordId || task.timestamp !== saveTask.timestamp
      ));
    }
  };

  const handleRestartSession = async () => {
    if (!user || !wordbookId) return;
    
    try {
      setIsLoading(true);
      // 重置今日学习计划
      await dailyPlanService.resetTodayPlan(user.uid, wordbookId);
      // 重新初始化学习会话
      await initializeStudySession();
    } catch (error) {
      console.error('重置学习会话失败:', error);
      setMessage({ type: 'error', text: '重置学习会话失败' });
    }
  };

  const handleBackToWordbooks = () => {
    navigate('/wordbooks', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xl text-white">准备学习材料...</span>
          <div className="text-sm text-gray-400 text-center">
            <p>正在加载今日学习计划</p>
            <p>自动恢复学习进度</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-xl mb-4">无法加载学习会话</p>
          <button 
            onClick={handleBackToWordbooks}
            className="px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 transition"
          >
            返回词书
          </button>
        </div>
      </div>
    );
  }

  if (session.isCompleted) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center space-y-6 px-6 bg-gray-900 text-white">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-semibold tracking-tight">恭喜完成！</h2>
        <div className="text-lg text-gray-400 space-y-2">
          <p>今日学习目标已达成</p>
          <div className="bg-gray-800 rounded-lg p-4 space-y-2">
            <p>
              认识：<span className="text-green-400">{session.plan.stats.knownCount}</span> 个　　
              不认识：<span className="text-red-400">{session.plan.stats.unknownCount}</span> 个
            </p>
            <p>
              准确率：<span className="text-purple-400">{Math.round(session.plan.stats.accuracy)}%</span>
            </p>
            <p className="text-sm text-gray-500">
              新词：{session.plan.newWordsCount} 个，复习：{session.plan.reviewWordsCount} 个
            </p>
          </div>
        </div>
        <div className="flex space-x-4">
          <button 
            onClick={handleRestartSession}
            className="px-6 py-3 rounded-lg text-white font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition"
          >
            再来一次
          </button>
          <button 
            onClick={handleBackToWordbooks}
            className="px-6 py-3 rounded-lg text-white font-medium bg-gray-700 hover:bg-gray-600 transition"
          >
            返回词书
          </button>
        </div>
      </div>
    );
  }

    return (
    <>
      {/* 消息提示 */}
      {message && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-white ${
          message.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {message.text}
        </div>
      )}
      
      {/* 学习卡片 */}
      {session.currentCard && (
        <StudyCard
          card={session.currentCard}
          showAnswer={false}
          onShowAnswer={() => {}}
          onRating={handleRating}
          current={session.plan.currentIndex}
          total={session.plan.totalCount}
          onBack={handleBackToWordbooks}
          scheduler={null}
        />
      )}
      
      {/* 后台保存队列指示（仅开发时显示） */}
      {backgroundSaveQueue.length > 0 && process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg text-xs">
          后台保存: {backgroundSaveQueue.length}
        </div>
      )}
    </>
  );
}