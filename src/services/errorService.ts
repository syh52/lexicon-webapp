import { AppError, Message } from '../types';

/**
 * 错误处理服务
 * 提供统一的错误处理、日志记录和用户反馈
 */

export enum ErrorCode {
  // 网络错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // 认证错误
  AUTH_FAILED = 'AUTH_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  
  // 业务错误
  WORDBOOK_NOT_FOUND = 'WORDBOOK_NOT_FOUND',
  WORD_NOT_FOUND = 'WORD_NOT_FOUND',
  STUDY_RECORD_NOT_FOUND = 'STUDY_RECORD_NOT_FOUND',
  DAILY_PLAN_NOT_FOUND = 'DAILY_PLAN_NOT_FOUND',
  
  // 数据错误
  INVALID_DATA = 'INVALID_DATA',
  DATA_CORRUPTION = 'DATA_CORRUPTION',
  STORAGE_FULL = 'STORAGE_FULL',
  
  // 系统错误
  SERVER_ERROR = 'SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class LexiconError extends Error {
  public code: ErrorCode;
  public details?: any;
  public timestamp: Date;
  public userMessage: string;
  public retryable: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    userMessage: string,
    details?: any,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'LexiconError';
    this.code = code;
    this.userMessage = userMessage;
    this.details = details;
    this.timestamp = new Date();
    this.retryable = retryable;
  }
}

class ErrorService {
  private errorLog: AppError[] = [];
  private maxLogSize = 100;
  private retryAttempts = new Map<string, number>();
  private maxRetries = 3;

  /**
   * 处理错误
   */
  handleError(error: Error | LexiconError, context?: string): Message {
    const appError = this.normalizeError(error, context);
    
    // 记录错误
    this.logError(appError);
    
    // 生成用户友好的消息
    const userMessage = this.generateUserMessage(appError);
    
    // 发送到监控服务（生产环境）
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(appError);
    }
    
    return {
      type: 'error',
      text: userMessage,
      duration: 5000
    };
  }

  /**
   * 标准化错误
   */
  private normalizeError(error: Error | LexiconError, context?: string): AppError {
    if (error instanceof LexiconError) {
      return {
        code: error.code,
        message: error.message,
        details: {
          userMessage: error.userMessage,
          retryable: error.retryable,
          context,
          ...error.details
        },
        timestamp: error.timestamp
      };
    }
    
    // 根据错误类型判断错误代码
    let code = ErrorCode.UNKNOWN_ERROR;
    let retryable = false;
    
    if (error.message.includes('网络')) {
      code = ErrorCode.NETWORK_ERROR;
      retryable = true;
    } else if (error.message.includes('超时')) {
      code = ErrorCode.TIMEOUT_ERROR;
      retryable = true;
    } else if (error.message.includes('认证')) {
      code = ErrorCode.AUTH_FAILED;
    } else if (error.message.includes('权限')) {
      code = ErrorCode.PERMISSION_DENIED;
    } else if (error.message.includes('服务器')) {
      code = ErrorCode.SERVER_ERROR;
      retryable = true;
    }
    
    return {
      code,
      message: error.message,
      details: {
        retryable,
        context,
        stack: error.stack
      },
      timestamp: new Date()
    };
  }

  /**
   * 记录错误
   */
  private logError(error: AppError): void {
    this.errorLog.push(error);
    
    // 保持日志大小
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }
    
    // 控制台输出（开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 Error:', error);
    }
  }

  /**
   * 生成用户友好的错误消息
   */
  private generateUserMessage(error: AppError): string {
    const userMessages: Record<ErrorCode, string> = {
      [ErrorCode.NETWORK_ERROR]: '网络连接异常，请检查网络设置',
      [ErrorCode.TIMEOUT_ERROR]: '请求超时，请稍后重试',
      [ErrorCode.AUTH_FAILED]: '登录验证失败，请重新登录',
      [ErrorCode.TOKEN_EXPIRED]: '登录已过期，请重新登录',
      [ErrorCode.PERMISSION_DENIED]: '权限不足，无法执行此操作',
      [ErrorCode.WORDBOOK_NOT_FOUND]: '词书不存在或已被删除',
      [ErrorCode.WORD_NOT_FOUND]: '单词不存在',
      [ErrorCode.STUDY_RECORD_NOT_FOUND]: '学习记录不存在',
      [ErrorCode.DAILY_PLAN_NOT_FOUND]: '学习计划不存在',
      [ErrorCode.INVALID_DATA]: '数据格式错误，请检查输入',
      [ErrorCode.DATA_CORRUPTION]: '数据损坏，请联系技术支持',
      [ErrorCode.STORAGE_FULL]: '存储空间不足，请清理缓存',
      [ErrorCode.SERVER_ERROR]: '服务器内部错误，请稍后重试',
      [ErrorCode.SERVICE_UNAVAILABLE]: '服务暂时不可用，请稍后重试',
      [ErrorCode.UNKNOWN_ERROR]: '未知错误，请刷新页面重试'
    };
    
    return error.details?.userMessage || userMessages[error.code] || userMessages[ErrorCode.UNKNOWN_ERROR];
  }

  /**
   * 发送到监控服务
   */
  private sendToMonitoring(error: AppError): void {
    // 这里可以集成第三方监控服务
    // 例如：Sentry, LogRocket, Bugsnag 等
    try {
      // 模拟发送到监控服务
      if (window.navigator.sendBeacon) {
        const payload = JSON.stringify({
          type: 'error',
          error: {
            code: error.code,
            message: error.message,
            timestamp: error.timestamp,
            url: window.location.href,
            userAgent: window.navigator.userAgent
          }
        });
        
        window.navigator.sendBeacon('/api/monitoring/errors', payload);
      }
    } catch (monitoringError) {
      console.warn('发送监控数据失败:', monitoringError);
    }
  }

  /**
   * 重试机制
   */
  async retry<T>(
    operation: () => Promise<T>,
    errorContext: string,
    maxRetries: number = this.maxRetries
  ): Promise<T> {
    const key = `${errorContext}_${Date.now()}`;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        this.retryAttempts.delete(key);
        return result;
      } catch (error) {
        this.retryAttempts.set(key, attempt);
        
        if (attempt === maxRetries) {
          const lexiconError = new LexiconError(
            ErrorCode.SERVER_ERROR,
            `操作失败，已重试 ${maxRetries} 次`,
            `操作失败，请稍后重试`,
            { originalError: error, attempts: attempt },
            false
          );
          throw lexiconError;
        }
        
        // 指数退避
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new LexiconError(
      ErrorCode.UNKNOWN_ERROR,
      '重试机制异常',
      '操作异常，请刷新页面重试'
    );
  }

  /**
   * 获取错误日志
   */
  getErrorLog(): AppError[] {
    return [...this.errorLog];
  }

  /**
   * 清空错误日志
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): {
    total: number;
    byCode: Record<string, number>;
    recent: AppError[];
  } {
    const byCode: Record<string, number> = {};
    
    this.errorLog.forEach(error => {
      byCode[error.code] = (byCode[error.code] || 0) + 1;
    });
    
    const recent = this.errorLog
      .filter(error => Date.now() - error.timestamp.getTime() < 60000)
      .slice(-10);
    
    return {
      total: this.errorLog.length,
      byCode,
      recent
    };
  }
}

// 创建单例实例
const errorService = new ErrorService();

/**
 * 错误处理装饰器
 */
export const withErrorHandling = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: string
): T => {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      const message = errorService.handleError(error as Error, context);
      throw new LexiconError(
        ErrorCode.UNKNOWN_ERROR,
        error.message,
        message.text,
        { originalError: error }
      );
    }
  }) as T;
};

/**
 * 异步错误边界
 */
export const asyncErrorBoundary = async <T>(
  operation: () => Promise<T>,
  fallback: T,
  context: string
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    errorService.handleError(error as Error, context);
    return fallback;
  }
};

/**
 * 预定义的错误创建函数
 */
export const createError = {
  network: (message: string, details?: any) => 
    new LexiconError(ErrorCode.NETWORK_ERROR, message, '网络连接异常', details, true),
  
  auth: (message: string, details?: any) => 
    new LexiconError(ErrorCode.AUTH_FAILED, message, '认证失败，请重新登录', details),
  
  notFound: (resource: string, details?: any) => 
    new LexiconError(ErrorCode.WORDBOOK_NOT_FOUND, `${resource}不存在`, `${resource}不存在或已被删除`, details),
  
  validation: (message: string, details?: any) => 
    new LexiconError(ErrorCode.INVALID_DATA, message, '数据格式错误，请检查输入', details),
  
  server: (message: string, details?: any) => 
    new LexiconError(ErrorCode.SERVER_ERROR, message, '服务器错误，请稍后重试', details, true)
};

/**
 * React错误边界组件
 */
export const ErrorBoundary = ({ children, fallback }: { 
  children: React.ReactNode;
  fallback: React.ComponentType<{ error: Error; reset: () => void }>;
}) => {
  const [error, setError] = React.useState<Error | null>(null);
  
  React.useEffect(() => {
    if (error) {
      errorService.handleError(error, 'ErrorBoundary');
    }
  }, [error]);
  
  const reset = React.useCallback(() => {
    setError(null);
  }, []);
  
  if (error) {
    return React.createElement(fallback, { error, reset });
  }
  
  return React.createElement(
    'div',
    {
      onError: (event: ErrorEvent) => {
        setError(new Error(event.error?.message || '未知错误'));
      }
    },
    children
  );
};

export default errorService;