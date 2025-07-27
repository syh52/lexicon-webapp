import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BatchUploadOnly } from '../components/auth/RequireAdmin';
import { PromoteButton } from '../components/admin/KeyPromotionModal';
import FileUploadZone from '../components/upload/FileUploadZone';
import DataPreview from '../components/upload/DataPreview';
import UploadProgress from '../components/upload/UploadProgress';
import FormatGuide from '../components/upload/FormatGuide';
import { UploadService, UploadProgress as UploadProgressType } from '../services/uploadService';
import { parseCSV, parseJSON, WordData, WordbookData } from '../utils/fileUtils';

type UploadStep = 'select' | 'preview' | 'uploading' | 'success' | 'error';

export default function UploadPage() {
  const navigate = useNavigate();
  const { user, hasPermission, isAdmin } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<UploadStep>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<WordData[] | WordbookData | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressType>({
    progress: 0,
    status: 'uploading'
  });
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    wordbookId?: string;
    wordCount?: number;
  } | null>(null);

  // RequireAuth已确保用户已登录且具有管理员权限

  const handleFileSelect = useCallback(async (file: File) => {
    try {
      setSelectedFile(file);
      setCurrentStep('preview');
      
      // 读取并解析文件
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const content = e.target.result as string;
          const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
          
          try {
            let data: WordData[] | WordbookData;
            
            if (fileExtension === '.csv') {
              data = parseCSV(content);
            } else if (fileExtension === '.json') {
              data = parseJSON(content);
            } else {
              throw new Error('不支持的文件格式');
            }
            
            setParsedData(data);
          } catch (error) {
            console.error('文件解析失败:', error);
            setCurrentStep('error');
            setUploadProgress({
              progress: 0,
              status: 'error',
              message: error instanceof Error ? error.message : '文件解析失败'
            });
          }
        }
      };
      reader.readAsText(file, 'UTF-8');
    } catch (error) {
      console.error('文件选择失败:', error);
      setCurrentStep('error');
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !parsedData) return;

    setCurrentStep('uploading');
    setUploadProgress({
      progress: 0,
      status: 'uploading',
      message: '开始上传...'
    });

    const uploadService = new UploadService((progress) => {
      setUploadProgress(progress);
    });

    try {
      const result = await uploadService.uploadWordbook(selectedFile);
      
      if (result.success) {
        setCurrentStep('success');
        setUploadResult({
          success: true,
          message: result.message,
          wordbookId: result.data?.wordbookId,
          wordCount: result.data?.wordCount
        });
      } else {
        setCurrentStep('error');
        setUploadResult({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      setCurrentStep('error');
      setUploadResult({
        success: false,
        message: error instanceof Error ? error.message : '上传失败'
      });
    }
  }, [selectedFile, parsedData]);

  const handleReset = useCallback(() => {
    setCurrentStep('select');
    setSelectedFile(null);
    setParsedData(null);
    setUploadProgress({ progress: 0, status: 'uploading' });
    setUploadResult(null);
    setPreviewExpanded(false);
  }, []);

  const handleGoToWordbooks = useCallback(() => {
    navigate('/wordbooks');
  }, [navigate]);

  // 权限检查 - 如果没有批量上传权限，显示权限提升界面
  if (!hasPermission('batch_upload')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <Upload className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              需要管理员权限
            </h2>
            <p className="text-gray-600 mb-4">
              批量上传功能需要管理员权限才能使用。请使用管理员密钥来获取权限。
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800 text-left">
                  <p className="font-medium mb-1">批量上传功能包括：</p>
                  <ul className="space-y-1 text-blue-700">
                    <li>• 单词库批量导入</li>
                    <li>• 对话库批量导入</li>
                    <li>• CSV/JSON 格式支持</li>
                    <li>• 数据预览和验证</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-600 mb-4">
              当前用户角色：
              <span className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">
                {user?.role === 'super_admin' ? '超级管理员' : 
                 user?.role === 'admin' ? '管理员' : '普通用户'}
              </span>
            </div>
            
            <PromoteButton className="w-full" />
            
            <button 
              onClick={() => navigate('/')}
              className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BatchUploadOnly>
      <div className="max-w-6xl mx-auto px-4 py-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">批量上传单词</h1>
            <p className="text-gray-400 text-sm">支持CSV和JSON格式的单词数据</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
            <Upload className="h-5 w-5 text-purple-400" />
          </div>
          <div className="text-sm">
            <div className="text-white font-medium">欢迎, {user?.displayName || '用户'}</div>
            <div className="text-gray-400">管理员权限</div>
          </div>
        </div>
      </div>

      {/* 步骤指示器 */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 ${
            currentStep === 'select' ? 'text-purple-400' : 
            ['preview', 'uploading', 'success', 'error'].includes(currentStep) ? 'text-green-400' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'select' ? 'bg-purple-500/20' : 
              ['preview', 'uploading', 'success', 'error'].includes(currentStep) ? 'bg-green-500/20' : 'bg-gray-700'
            }`}>
              {['preview', 'uploading', 'success', 'error'].includes(currentStep) ? '✓' : '1'}
            </div>
            <span className="text-sm font-medium">选择文件</span>
          </div>
          
          <div className={`w-8 h-0.5 ${
            ['preview', 'uploading', 'success', 'error'].includes(currentStep) ? 'bg-green-400' : 'bg-gray-600'
          }`}></div>
          
          <div className={`flex items-center space-x-2 ${
            currentStep === 'preview' ? 'text-purple-400' : 
            ['uploading', 'success', 'error'].includes(currentStep) ? 'text-green-400' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'preview' ? 'bg-purple-500/20' : 
              ['uploading', 'success', 'error'].includes(currentStep) ? 'bg-green-500/20' : 'bg-gray-700'
            }`}>
              {['uploading', 'success', 'error'].includes(currentStep) ? '✓' : '2'}
            </div>
            <span className="text-sm font-medium">预览数据</span>
          </div>
          
          <div className={`w-8 h-0.5 ${
            ['uploading', 'success', 'error'].includes(currentStep) ? 'bg-green-400' : 'bg-gray-600'
          }`}></div>
          
          <div className={`flex items-center space-x-2 ${
            currentStep === 'uploading' ? 'text-purple-400' : 
            ['success', 'error'].includes(currentStep) ? 'text-green-400' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'uploading' ? 'bg-purple-500/20' : 
              ['success', 'error'].includes(currentStep) ? 'bg-green-500/20' : 'bg-gray-700'
            }`}>
              {['success', 'error'].includes(currentStep) ? '✓' : '3'}
            </div>
            <span className="text-sm font-medium">上传完成</span>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：主要操作区域 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 文件选择 */}
          {currentStep === 'select' && (
            <FileUploadZone
              onFileSelect={handleFileSelect}
              isUploading={false}
            />
          )}

          {/* 数据预览 */}
          {currentStep === 'preview' && parsedData && (
            <div className="space-y-6">
              <DataPreview
                data={parsedData}
                isExpanded={previewExpanded}
                onToggleExpand={() => setPreviewExpanded(!previewExpanded)}
              />
              
              <div className="flex items-center justify-between">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  重新选择文件
                </button>
                
                <button
                  onClick={handleUpload}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2"
                >
                  <Upload className="h-4 w-4" />
                  <span>开始上传</span>
                </button>
              </div>
            </div>
          )}

          {/* 上传进度 */}
          {['uploading', 'success', 'error'].includes(currentStep) && (
            <div className="space-y-6">
              <UploadProgress
                progress={uploadProgress.progress}
                status={uploadProgress.status}
                message={uploadProgress.message}
                currentStep={uploadProgress.currentStep}
              />
              
              {currentStep === 'success' && (
                <div className="flex items-center justify-center space-x-4">
                  <button
                    onClick={handleReset}
                    className="px-6 py-3 glass-card text-white rounded-xl hover:bg-white/20 transition-all duration-200"
                  >
                    继续上传
                  </button>
                  
                  <button
                    onClick={handleGoToWordbooks}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>查看词书</span>
                  </button>
                </div>
              )}
              
              {currentStep === 'error' && (
                <div className="flex items-center justify-center">
                  <button
                    onClick={handleReset}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
                  >
                    重新上传
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 右侧：格式说明 */}
        <div className="space-y-6">
          <FormatGuide />
          
          {/* 上传统计 */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">上传统计</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">本次上传</span>
                <span className="text-white">
                  {parsedData ? 
                    ('words' in parsedData ? parsedData.words.length : parsedData.length) + ' 个单词' : 
                    '0 个单词'
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">文件格式</span>
                <span className="text-white">
                  {selectedFile ? 
                    selectedFile.name.substring(selectedFile.name.lastIndexOf('.') + 1).toUpperCase() : 
                    '-'
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">文件大小</span>
                <span className="text-white">
                  {selectedFile ? 
                    (selectedFile.size / 1024).toFixed(2) + ' KB' : 
                    '-'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </BatchUploadOnly>
  );
}