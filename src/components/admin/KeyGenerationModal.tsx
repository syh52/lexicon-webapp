import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { getApp, ensureLogin } from '../../utils/cloudbase';

interface KeyGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (keyData: any) => void;
}

interface KeyFormData {
  type: 'admin';
  maxUses: number;
  expiresInDays: number;
}

export const KeyGenerationModal: React.FC<KeyGenerationModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState<KeyFormData>({
    type: 'admin',
    maxUses: 10,
    expiresInDays: 30
  });
  const [loading, setLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<{
    plainKey: string;
    keyInfo: any;
  } | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setMessage('');
      setMessageType('');
      
      await ensureLogin();
      const app = getApp();
      
      const result = await app.callFunction({
        name: 'admin-management',
        data: { 
          action: 'generateKey',
          keyType: formData.type,
          maxUses: formData.maxUses,
          expiresInDays: formData.expiresInDays
        }
      });
      
      if (result.result?.success) {
        setGeneratedKey({
          plainKey: result.result.data.plainKey,
          keyInfo: result.result.data.keyInfo
        });
        setMessage('管理员密钥生成成功！');
        setMessageType('success');
        onSuccess?.(result.result.data);
      } else {
        setMessage(result.result?.error || '生成失败');
        setMessageType('error');
      }
    } catch (error: any) {
      setMessage(error.message || '生成失败');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        type: 'admin',
        maxUses: 10,
        expiresInDays: 30
      });
      setGeneratedKey(null);
      setMessage('');
      setMessageType('');
      onClose();
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage('密钥已复制到剪贴板！');
      setMessageType('success');
      setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 2000);
    } catch (error) {
      setMessage('复制失败，请手动复制');
      setMessageType('error');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="生成管理员密钥">
      <div className="space-y-6">
        {!generatedKey ? (
          // 密钥生成表单
          <>
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg 
                  className="w-8 h-8 text-green-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-15L7 7.5 5 10l5-5 5 5M12 6V3m0 3v3" 
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                创建新的管理员密钥
              </h3>
              <p className="text-gray-600 mb-6">
                配置密钥参数并生成可用于权限提升的管理员密钥。
              </p>
            </div>

            <Card className="p-4 bg-amber-50 border border-amber-200">
              <div className="flex items-start space-x-3">
                <svg 
                  className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.081 16.5c-.77.833.192 2.5 1.732 2.5z" 
                  />
                </svg>
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">安全提醒：</p>
                  <ul className="space-y-1 text-amber-700">
                    <li>• 生成的密钥只会显示一次，请妥善保存</li>
                    <li>• 不要在不安全的环境中分享密钥</li>
                    <li>• 建议设置合理的使用次数限制</li>
                  </ul>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  密钥类型
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'admin' })}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="admin">管理员密钥</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  管理员密钥可获得批量上传等基础管理权限
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  最大使用次数
                </label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) || 1 })}
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-gray-500">
                  密钥可以被使用的最大次数
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  有效期（天）
                </label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={formData.expiresInDays}
                  onChange={(e) => setFormData({ ...formData, expiresInDays: parseInt(e.target.value) || 1 })}
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-gray-500">
                  密钥的有效期，过期后自动失效（1-365天）
                </p>
              </div>
            </div>

            {message && messageType === 'error' && (
              <div className="p-3 rounded-md text-sm bg-red-100 text-red-800 border border-red-200">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>{message}</span>
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>生成中...</span>
                  </div>
                ) : (
                  '生成密钥'
                )}
              </Button>
            </div>
          </>
        ) : (
          // 密钥生成结果显示
          <>
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg 
                  className="w-8 h-8 text-green-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                密钥生成成功！
              </h3>
              <p className="text-gray-600 mb-6">
                请立即复制并妥善保存以下密钥，它将不会再次显示。
              </p>
            </div>

            <Card className="p-4 bg-red-50 border border-red-200">
              <div className="flex items-start space-x-3">
                <svg 
                  className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.081 16.5c-.77.833.192 2.5 1.732 2.5z" 
                  />
                </svg>
                <div className="text-sm text-red-800">
                  <p className="font-medium">重要：请立即保存密钥</p>
                  <p className="text-red-700 mt-1">
                    此密钥只会显示一次，关闭此窗口后将无法再次查看。
                  </p>
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  管理员密钥
                </label>
                <div className="flex space-x-2">
                  <Input
                    value={generatedKey.plainKey}
                    readOnly
                    className="font-mono text-sm bg-gray-50"
                  />
                  <Button
                    onClick={() => copyToClipboard(generatedKey.plainKey)}
                    variant="outline"
                    className="flex-shrink-0"
                  >
                    复制
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    密钥类型
                  </label>
                  <Badge variant="secondary">
                    {generatedKey.keyInfo.type === 'admin' ? '管理员' : '未知'}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最大使用次数
                  </label>
                  <span className="text-sm text-gray-900">
                    {generatedKey.keyInfo.maxUses} 次
                  </span>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    过期时间
                  </label>
                  <span className="text-sm text-gray-900">
                    {formatDate(generatedKey.keyInfo.expiresAt)}
                  </span>
                </div>
              </div>
            </div>

            {message && messageType === 'success' && (
              <div className="p-3 rounded-md text-sm bg-green-100 text-green-800 border border-green-200">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{message}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button onClick={handleClose}>完成</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};