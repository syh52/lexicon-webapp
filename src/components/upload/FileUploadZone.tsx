import React, { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { validateFileType, formatFileSize } from '../../utils/fileUtils';

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
  accept?: string;
  maxSize?: number; // 最大文件大小，单位：字节
}

export default function FileUploadZone({ 
  onFileSelect, 
  isUploading = false,
  accept = '.csv,.json',
  maxSize = 5 * 1024 * 1024 // 5MB
}: FileUploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    setError(null);
    
    // 验证文件类型
    if (!validateFileType(file)) {
      setError('不支持的文件类型，请上传CSV或JSON文件');
      return;
    }

    // 验证文件大小
    if (file.size > maxSize) {
      setError(`文件大小不能超过 ${formatFileSize(maxSize)}`);
      return;
    }

    setUploadedFile(file);
    onFileSelect(file);
  }, [onFileSelect, maxSize]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  }, [handleFileSelect]);

  const handleRemoveFile = useCallback(() => {
    setUploadedFile(null);
    setError(null);
  }, []);

  return (
    <div className="w-full">
      {!uploadedFile ? (
        <div
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 ${
            dragActive 
              ? 'border-purple-400 bg-purple-500/10' 
              : 'border-gray-600 hover:border-gray-500'
          } ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept={accept}
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />
          
          <div className="flex flex-col items-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              dragActive ? 'bg-purple-500/20' : 'bg-gray-700/50'
            }`}>
              <Upload className={`h-8 w-8 ${dragActive ? 'text-purple-400' : 'text-gray-400'}`} />
            </div>
            
            <h3 className="text-lg font-semibold text-white mb-2">
              {dragActive ? '松开鼠标上传文件' : '拖拽文件到这里'}
            </h3>
            
            <p className="text-gray-400 mb-4">
              或 <span className="text-purple-400 font-medium">点击选择文件</span>
            </p>
            
            <div className="text-sm text-gray-500 space-y-1">
              <p>支持格式：CSV、JSON</p>
              <p>最大大小：{formatFileSize(maxSize)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <h4 className="text-white font-medium">{uploadedFile.name}</h4>
                <p className="text-gray-400 text-sm">
                  {formatFileSize(uploadedFile.size)} • {uploadedFile.type || '未知类型'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              <button
                onClick={handleRemoveFile}
                className="text-gray-400 hover:text-white transition-colors"
                disabled={isUploading}
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}