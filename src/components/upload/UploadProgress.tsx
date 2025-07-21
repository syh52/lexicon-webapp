import React from 'react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface UploadProgressProps {
  progress: number;
  status: 'uploading' | 'success' | 'error';
  message?: string;
  currentStep?: string;
  totalSteps?: number;
  currentStepNumber?: number;
}

export default function UploadProgress({ 
  progress, 
  status, 
  message,
  currentStep,
  totalSteps,
  currentStepNumber
}: UploadProgressProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-400" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'uploading':
        return 'text-blue-400';
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return currentStep || '正在上传...';
      case 'success':
        return message || '上传成功！';
      case 'error':
        return message || '上传失败';
      default:
        return '';
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <span className={`font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>
        
        {totalSteps && currentStepNumber && (
          <span className="text-sm text-gray-400">
            {currentStepNumber} / {totalSteps}
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">进度</span>
          <span className="text-white font-medium">{progress}%</span>
        </div>
        
        <Progress 
          value={progress} 
          className="h-2" 
        />
        
        {message && status !== 'error' && (
          <p className="text-gray-400 text-sm">{message}</p>
        )}
      </div>

      {status === 'uploading' && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>解析文件</span>
            <span className={progress >= 25 ? 'text-green-400' : ''}>
              {progress >= 25 ? '✓' : '○'}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>验证数据</span>
            <span className={progress >= 50 ? 'text-green-400' : ''}>
              {progress >= 50 ? '✓' : '○'}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>上传到服务器</span>
            <span className={progress >= 75 ? 'text-green-400' : ''}>
              {progress >= 75 ? '✓' : '○'}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>完成处理</span>
            <span className={progress >= 100 ? 'text-green-400' : ''}>
              {progress >= 100 ? '✓' : '○'}
            </span>
          </div>
        </div>
      )}

      {status === 'error' && message && (
        <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span className="text-red-400 text-sm">{message}</span>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="mt-4 p-4 bg-green-500/20 border border-green-500/30 rounded-xl">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <span className="text-green-400 text-sm">
              {message || '词书上传成功！您可以在词书列表中查看新添加的内容。'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}