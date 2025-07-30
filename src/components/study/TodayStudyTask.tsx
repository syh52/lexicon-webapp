import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, BookOpen, Target, Clock, TrendingUp, Settings, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { wordbookService } from '../../services/wordbookService';
import { unifiedStudyPlanService, UnifiedStudyPlan } from '../../services/unifiedStudyPlanService';
import { BACKGROUNDS, TEXT_COLORS } from '../../constants/design';

interface TodayStudyTaskProps {
  className?: string;
}

interface StudyTaskData {
  unifiedPlan: UnifiedStudyPlan | null;
  wordbookName: string;
  hasActivePlan: boolean;
  isCompleted: boolean;
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  stats: {
    newWords: number;
    reviewWords: number;
    knownCount: number;
    unknownCount: number;
  };
  dataConsistency: {
    isConsistent: boolean;
    canFix: boolean;
  };
}

export const TodayStudyTask: React.FC<TodayStudyTaskProps> = ({ className = '' }) => {
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [taskData, setTaskData] = useState<StudyTaskData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoggedIn && user) {
      loadTodayTask();
    } else {
      setIsLoading(false);
    }
  }, [isLoggedIn, user]);

  const loadTodayTask = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 获取用户的词书列表，找到第一个活跃的词书
      const wordbooks = await wordbookService.getWordbooks();
      if (wordbooks.length === 0) {
        setTaskData({
          unifiedPlan: null,
          wordbookName: '',
          hasActivePlan: false,
          isCompleted: false,
          progress: { completed: 0, total: 0, percentage: 0 },
          stats: { newWords: 0, reviewWords: 0, knownCount: 0, unknownCount: 0 },
          dataConsistency: { isConsistent: true, canFix: false }
        });
        setIsLoading(false);
        return;
      }

      // 暂时使用第一个词书，后续可以根据用户设置选择活跃词书
      const activeWordbook = wordbooks[0];
      
      try {
        // 🔄 使用统一学习计划服务
        const unifiedPlan = await unifiedStudyPlanService.getUnifiedStudyPlan(user!.uid, activeWordbook._id);
        
        const taskData: StudyTaskData = {
          unifiedPlan,
          wordbookName: activeWordbook.name,
          hasActivePlan: true,
          isCompleted: unifiedPlan.displayPlan.isCompleted,
          progress: {
            completed: unifiedPlan.displayPlan.completedCount,
            total: unifiedPlan.displayPlan.totalCount,
            percentage: unifiedPlan.displayPlan.percentage
          },
          stats: {
            newWords: unifiedPlan.displayPlan.newWordsCount,
            reviewWords: unifiedPlan.displayPlan.reviewWordsCount,
            knownCount: unifiedPlan.stats.knownCount,
            unknownCount: unifiedPlan.stats.unknownCount
          },
          dataConsistency: {
            isConsistent: unifiedPlan.isDataConsistent,
            canFix: !unifiedPlan.isDataConsistent
          }
        };

        setTaskData(taskData);
        
        // 📊 数据一致性检查提示
        if (!unifiedPlan.isDataConsistent) {
          console.warn('⚠️ 检测到数据不一致，建议用户刷新或重置');
        }
        
      } catch (planError) {
        console.warn('获取统一学习计划失败，显示初始状态:', planError);
        setTaskData({
          unifiedPlan: null,
          wordbookName: activeWordbook.name,
          hasActivePlan: false,
          isCompleted: false,
          progress: { completed: 0, total: 0, percentage: 0 },
          stats: { newWords: 0, reviewWords: 0, knownCount: 0, unknownCount: 0 },
          dataConsistency: { isConsistent: false, canFix: true }
        });
      }
    } catch (error) {
      console.error('加载今日学习任务失败:', error);
      setError('加载学习任务失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartStudy = () => {
    if (!taskData?.unifiedPlan) {
      // 没有学习计划，引导用户设置
      navigate('/study-settings');
      return;
    }

    // 有学习计划，直接进入学习页面
    const wordbookId = taskData.unifiedPlan.wordbookId;
    navigate(`/study/${wordbookId}`);
  };
  
  const handleFixDataInconsistency = async () => {
    if (!taskData?.unifiedPlan || !user) return;
    
    try {
      setIsLoading(true);
      console.log('🔧 用户手动修复数据不一致...');
      
      await unifiedStudyPlanService.fixDataInconsistency(user.uid, taskData.unifiedPlan.wordbookId);
      
      // 重新加载数据
      await loadTodayTask();
      
    } catch (error) {
      console.error('修复数据不一致失败:', error);
      setError('修复数据失败，请刷新页面重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupPlan = () => {
    navigate('/study-settings');
  };

  if (!isLoggedIn) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={`glass-card rounded-3xl p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span className={`ml-3 ${TEXT_COLORS.MUTED}`}>加载今日任务...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`glass-card rounded-3xl p-6 ${className}`}>
        <div className="text-center py-8">
          <p className={`${TEXT_COLORS.ERROR} mb-4`}>{error}</p>
          <button 
            onClick={loadTodayTask}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!taskData) {
    return null;
  }

  return (
    <div className={`glass-card rounded-3xl p-6 sm:p-8 ${className}`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className={`text-xl sm:text-2xl font-semibold ${TEXT_COLORS.PRIMARY} mb-2`}>
            今日学习任务
          </h3>
          <p className={`${TEXT_COLORS.MUTED} text-sm sm:text-base`}>
            {taskData.wordbookName ? `正在学习：${taskData.wordbookName}` : '还未设置学习计划'}
          </p>
        </div>
        <button
          onClick={handleSetupPlan}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          title="设置学习计划"
        >
          <Settings className={`w-5 h-5 ${TEXT_COLORS.MUTED}`} />
        </button>
      </div>

      {!taskData.hasActivePlan ? (
        // 无学习计划状态
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-purple-400" />
          </div>
          <h4 className={`text-lg font-semibold ${TEXT_COLORS.PRIMARY} mb-2`}>
            开始你的学习之旅
          </h4>
          <p className={`${TEXT_COLORS.MUTED} mb-6 text-sm max-w-sm mx-auto leading-relaxed`}>
            设置学习目标，选择词书，开始科学的单词记忆之旅
          </p>
          <button
            onClick={handleSetupPlan}
            className="gradient-primary text-white px-6 py-3 rounded-xl font-medium hover:scale-105 transition-transform"
          >
            设置学习计划
          </button>
        </div>
      ) : taskData.isCompleted ? (
        // 学习完成状态
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-green-400" />
          </div>
          <h4 className={`text-lg font-semibold ${TEXT_COLORS.PRIMARY} mb-2`}>
            🎉 今日目标已完成！
          </h4>
          <div className="grid grid-cols-3 gap-4 mt-4 text-center">
            <div className="glass-card-strong rounded-lg p-3">
              <div className="text-green-400 font-semibold text-lg">{taskData.stats.knownCount}</div>
              <div className={`${TEXT_COLORS.MUTED} text-xs`}>认识</div>
            </div>
            <div className="glass-card-strong rounded-lg p-3">
              <div className="text-yellow-400 font-semibold text-lg">{taskData.stats.unknownCount}</div>
              <div className={`${TEXT_COLORS.MUTED} text-xs`}>不认识</div>
            </div>
            <div className="glass-card-strong rounded-lg p-3">
              <div className="text-purple-400 font-semibold text-lg">{taskData.progress.percentage}%</div>
              <div className={`${TEXT_COLORS.MUTED} text-xs`}>准确率</div>
            </div>
          </div>
          <button
            onClick={handleStartStudy}
            className="mt-4 px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            再来一轮
          </button>
        </div>
      ) : (
        // 学习进行中状态
        <div>
          {/* 🚨 数据不一致警告 */}
          {!taskData.dataConsistency.isConsistent && (
            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-black font-bold">!</span>
                  </div>
                  <span className="text-yellow-300 text-sm">检测到数据不同步</span>
                </div>
                {taskData.dataConsistency.canFix && (
                  <button
                    onClick={handleFixDataInconsistency}
                    className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 rounded text-xs text-yellow-300 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    修复
                  </button>
                )}
              </div>
            </div>
          )}
          
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className={`${TEXT_COLORS.SECONDARY} text-sm`}>学习进度</span>
              <span className={`${TEXT_COLORS.SECONDARY} text-sm`}>
                {taskData.progress.completed}/{taskData.progress.total}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${taskData.progress.percentage}%` }}
              />
            </div>
            <div className={`text-right text-xs ${TEXT_COLORS.MUTED} mt-1`}>
              {taskData.progress.percentage}% 完成
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="glass-card-strong rounded-lg p-4 text-center">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Target className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-blue-400 font-semibold text-lg">{taskData.stats.newWords}</div>
              <div className={`${TEXT_COLORS.MUTED} text-xs`}>新词</div>
            </div>
            <div className="glass-card-strong rounded-lg p-4 text-center">
              <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Clock className="w-4 h-4 text-orange-400" />
              </div>
              <div className="text-orange-400 font-semibold text-lg">{taskData.stats.reviewWords}</div>
              <div className={`${TEXT_COLORS.MUTED} text-xs`}>复习</div>
            </div>
          </div>

          <button
            onClick={handleStartStudy}
            className="w-full gradient-primary text-white py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-lg"
          >
            <Play className="w-5 h-5" />
            开始学习
          </button>
        </div>
      )}
    </div>
  );
};

export default TodayStudyTask;