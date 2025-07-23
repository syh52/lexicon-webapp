import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  toast: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (toastId: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  maxToasts?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  position = 'top-right',
  maxToasts = 5
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((toastData: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      id,
      duration: 5000,
      variant: 'default',
      ...toastData
    };

    setToasts(prev => {
      const newToasts = [newToast, ...prev];
      return newToasts.slice(0, maxToasts);
    });

    // 自动移除
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, newToast.duration);
    }

    return id;
  }, [maxToasts]);

  const dismiss = useCallback((toastId: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== toastId));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const value = {
    toasts,
    toast,
    dismiss,
    dismissAll
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} position={position} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

interface ToastViewportProps {
  toasts: Toast[];
  position: string;
  onDismiss: (toastId: string) => void;
}

const ToastViewport: React.FC<ToastViewportProps> = ({
  toasts,
  position,
  onDismiss
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || toasts.length === 0) {
    return null;
  }

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
  };

  const viewport = (
    <div
      className={cn(
        'fixed z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none',
        positionClasses[position as keyof typeof positionClasses]
      )}
    >
      {toasts.map((toast) => (
        <ToastComponent
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );

  return createPortal(viewport, document.body);
};

interface ToastComponentProps {
  toast: Toast;
  onDismiss: (toastId: string) => void;
}

const ToastComponent: React.FC<ToastComponentProps> = ({
  toast,
  onDismiss
}) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 300);
  };

  const variants = {
    default: {
      bg: 'bg-gray-800 border-gray-700',
      icon: <Info className="w-5 h-5 text-blue-400" />,
      iconBg: 'bg-blue-400/10'
    },
    success: {
      bg: 'bg-gray-800 border-green-500/30',
      icon: <CheckCircle className="w-5 h-5 text-green-400" />,
      iconBg: 'bg-green-400/10'
    },
    error: {
      bg: 'bg-gray-800 border-red-500/30',
      icon: <XCircle className="w-5 h-5 text-red-400" />,
      iconBg: 'bg-red-400/10'
    },
    warning: {
      bg: 'bg-gray-800 border-yellow-500/30',
      icon: <AlertCircle className="w-5 h-5 text-yellow-400" />,
      iconBg: 'bg-yellow-400/10'
    },
    info: {
      bg: 'bg-gray-800 border-blue-500/30',
      icon: <Info className="w-5 h-5 text-blue-400" />,
      iconBg: 'bg-blue-400/10'
    }
  };

  const variant = variants[toast.variant || 'default'];

  return (
    <div
      className={cn(
        'group pointer-events-auto relative flex w-full items-center gap-3 rounded-lg border p-4 shadow-lg backdrop-blur-sm transition-all duration-300',
        variant.bg,
        isExiting 
          ? 'animate-out fade-out slide-out-to-right-full duration-300'
          : 'animate-in fade-in slide-in-from-right-full duration-300'
      )}
    >
      {/* 图标 */}
      <div className={cn('flex-shrink-0 rounded-full p-1', variant.iconBg)}>
        {variant.icon}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <div className="text-sm font-medium text-white">
            {toast.title}
          </div>
        )}
        {toast.description && (
          <div className="text-sm text-gray-400 mt-1">
            {toast.description}
          </div>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="text-sm font-medium text-purple-400 hover:text-purple-300 mt-2"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* 关闭按钮 */}
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 rounded-md p-1 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        aria-label="关闭"
      >
        <X className="w-4 h-4" />
      </button>

      {/* 进度条（如果有持续时间） */}
      {toast.duration && toast.duration > 0 && (
        <div
          className="absolute bottom-0 left-0 h-1 bg-purple-500 rounded-b-lg animate-progress"
          style={{
            animation: `toast-progress ${toast.duration}ms linear forwards`
          }}
        />
      )}
    </div>
  );
};

// CSS动画样式 - 需要添加到全局CSS中
const toastStyles = `
@keyframes toast-progress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

.animate-progress {
  animation-name: toast-progress;
}
`;

// 注入样式
if (typeof window !== 'undefined') {
  const styleElement = document.getElementById('toast-styles');
  if (!styleElement) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = toastStyles;
    document.head.appendChild(style);
  }
}

// 便捷方法
export const createToastHelpers = (toast: ToastContextType['toast']) => ({
  success: (message: string, options?: Partial<Toast>) =>
    toast({ variant: 'success', description: message, ...options }),
  
  error: (message: string, options?: Partial<Toast>) =>
    toast({ variant: 'error', description: message, ...options }),
  
  warning: (message: string, options?: Partial<Toast>) =>
    toast({ variant: 'warning', description: message, ...options }),
  
  info: (message: string, options?: Partial<Toast>) =>
    toast({ variant: 'info', description: message, ...options }),
  
  loading: (message: string, options?: Partial<Toast>) =>
    toast({ variant: 'default', description: message, duration: 0, ...options }),
});

export default Toast;