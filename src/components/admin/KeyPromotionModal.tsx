import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Modal, ModalHeader, ModalTitle, ModalContent } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

interface KeyPromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const KeyPromotionModal: React.FC<KeyPromotionModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { promoteWithKey } = useAuth();
  const [adminKey, setAdminKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adminKey.trim()) {
      setMessage('请输入管理员密钥');
      setMessageType('error');
      return;
    }

    try {
      setLoading(true);
      setMessage('');
      setMessageType('');
      
      await promoteWithKey(adminKey);
      setMessage('权限提升成功！');
      setMessageType('success');
      
      // 3秒后关闭弹窗并调用成功回调
      setTimeout(() => {
        onClose();
        onSuccess?.();
        // 清空表单
        setAdminKey('');
        setMessage('');
        setMessageType('');
      }, 2000);
      
    } catch (error: any) {
      setMessage(error.message || '权限提升失败');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setAdminKey('');
      setMessage('');
      setMessageType('');
      onClose();
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && handleClose()} size="md">
      <ModalHeader>
        <ModalTitle>权限提升</ModalTitle>
      </ModalHeader>
      <ModalContent>
        <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            <svg 
              className="w-8 h-8 text-indigo-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3.586l4.293-4.293A6 6 0 0119 9z" 
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            管理员权限提升
          </h3>
          <p className="text-gray-600 mb-6">
            输入有效的管理员密钥来获取管理员权限，包括批量上传功能等高级特性。
          </p>
        </div>

        <Card className="p-4 bg-blue-50 border border-blue-200">
          <div className="flex items-start space-x-3">
            <svg 
              className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">密钥类型说明：</p>
              <ul className="space-y-1 text-blue-700">
                <li>• <strong>超级管理员密钥</strong>：获得所有管理权限</li>
                <li>• <strong>管理员密钥</strong>：获得基础管理权限</li>
              </ul>
            </div>
          </div>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="adminKey" className="block text-sm font-medium text-gray-700 mb-2">
              管理员密钥
            </label>
            <Input
              id="adminKey"
              type="password"
              placeholder="请输入管理员密钥"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              disabled={loading}
              className="font-mono text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              密钥通常以 LEXICON_ 开头，请确保输入完整密钥
            </p>
          </div>

          {message && (
            <div className={`p-3 rounded-md text-sm ${
              messageType === 'success' 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              <div className="flex items-center space-x-2">
                {messageType === 'success' ? (
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
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
              type="submit"
              disabled={loading || !adminKey.trim()}
              className="flex-1"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>提升中...</span>
                </div>
              ) : (
                '提升权限'
              )}
            </Button>
          </div>
        </form>
        </div>
      </ModalContent>
    </Modal>
  );
};

// 简化的权限提升按钮组件
interface PromoteButtonProps {
  className?: string;
  variant?: 'primary' | 'outline';
  children?: React.ReactNode;
}

export const PromoteButton: React.FC<PromoteButtonProps> = ({ 
  className = '', 
  variant = 'primary',
  children = '获取管理员权限'
}) => {
  const [showModal, setShowModal] = useState(false);

  const handleSuccess = () => {
    // 权限提升成功后刷新页面
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <>
      <Button
        variant={variant}
        onClick={() => setShowModal(true)}
        className={className}
      >
        {children}
      </Button>
      
      <KeyPromotionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
};