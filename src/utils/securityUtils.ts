/**
 * 安全工具函数
 * 提供数据验证、XSS防护、敏感信息过滤等安全功能
 */

import { User } from '../types';

// 邮箱验证正则
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// 密码强度验证正则
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

// 用户名验证正则
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

// 危险HTML标签和属性
const DANGEROUS_HTML_TAGS = [
  'script', 'iframe', 'embed', 'object', 'applet', 
  'link', 'style', 'meta', 'form', 'input', 'textarea'
];

const DANGEROUS_HTML_ATTRS = [
  'onload', 'onclick', 'onerror', 'onmouseover', 
  'onmouseout', 'onkeydown', 'onkeyup', 'onfocus', 
  'onblur', 'onchange', 'onsubmit', 'javascript:'
];

/**
 * 输入验证
 */
export const validation = {
  /**
   * 验证邮箱格式
   */
  email: (email: string): boolean => {
    return EMAIL_REGEX.test(email.trim());
  },

  /**
   * 验证密码强度
   */
  password: (password: string): {
    isValid: boolean;
    errors: string[];
  } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('密码长度至少8位');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('密码必须包含小写字母');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('密码必须包含大写字母');
    }
    
    if (!/\d/.test(password)) {
      errors.push('密码必须包含数字');
    }
    
    if (password.length > 128) {
      errors.push('密码长度不能超过128位');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * 验证用户名格式
   */
  username: (username: string): boolean => {
    return USERNAME_REGEX.test(username.trim());
  },

  /**
   * 验证显示名称
   */
  displayName: (displayName: string): boolean => {
    const trimmed = displayName.trim();
    return trimmed.length >= 2 && trimmed.length <= 50;
  },

  /**
   * 验证手机号码
   */
  phone: (phone: string): boolean => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone.trim());
  },

  /**
   * 验证URL格式
   */
  url: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * XSS防护
 */
export const xssProtection = {
  /**
   * 转义HTML特殊字符
   */
  escapeHtml: (text: string): string => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;'
    };
    
    return text.replace(/[&<>"'/]/g, (char) => map[char]);
  },

  /**
   * 清理HTML内容
   */
  sanitizeHtml: (html: string): string => {
    let cleaned = html;
    
    // 移除危险标签
    DANGEROUS_HTML_TAGS.forEach(tag => {
      const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gis');
      cleaned = cleaned.replace(regex, '');
    });
    
    // 移除危险属性
    DANGEROUS_HTML_ATTRS.forEach(attr => {
      const regex = new RegExp(`\\s${attr}\\s*=\\s*[^\\s>]*`, 'gi');
      cleaned = cleaned.replace(regex, '');
    });
    
    return cleaned;
  },

  /**
   * 验证用户输入是否包含潜在XSS
   */
  detectXSS: (input: string): boolean => {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<embed[^>]*>/gi,
      /<object[^>]*>.*?<\/object>/gi
    ];
    
    return xssPatterns.some(pattern => pattern.test(input));
  }
};

/**
 * 敏感信息过滤
 */
export const sensitiveDataFilter = {
  /**
   * 过滤敏感信息
   */
  filterSensitiveData: (data: any): any => {
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'auth',
      'credential', 'private', 'confidential'
    ];
    
    const filtered = { ...data };
    
    Object.keys(filtered).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        filtered[key] = '***';
      } else if (typeof filtered[key] === 'object') {
        filtered[key] = sensitiveDataFilter.filterSensitiveData(filtered[key]);
      }
    });
    
    return filtered;
  },

  /**
   * 脱敏邮箱地址
   */
  maskEmail: (email: string): string => {
    if (!email || !email.includes('@')) return email;
    
    const [username, domain] = email.split('@');
    const maskedUsername = username.length > 2 
      ? username.substring(0, 2) + '*'.repeat(username.length - 2)
      : username;
    
    return `${maskedUsername}@${domain}`;
  },

  /**
   * 脱敏手机号
   */
  maskPhone: (phone: string): string => {
    if (!phone || phone.length < 7) return phone;
    
    return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
  }
};

/**
 * 输入清理
 */
export const inputSanitizer = {
  /**
   * 清理字符串输入
   */
  sanitizeString: (input: string, maxLength: number = 1000): string => {
    if (!input || typeof input !== 'string') return '';
    
    return input
      .trim()
      .substring(0, maxLength)
      .replace(/[\r\n\t]/g, ' ')
      .replace(/\s+/g, ' ');
  },

  /**
   * 清理数字输入
   */
  sanitizeNumber: (input: any, min?: number, max?: number): number | null => {
    const num = Number(input);
    if (isNaN(num)) return null;
    
    if (min !== undefined && num < min) return min;
    if (max !== undefined && num > max) return max;
    
    return num;
  },

  /**
   * 清理布尔值输入
   */
  sanitizeBoolean: (input: any): boolean => {
    if (typeof input === 'boolean') return input;
    if (typeof input === 'string') {
      return input.toLowerCase() === 'true';
    }
    return Boolean(input);
  },

  /**
   * 清理数组输入
   */
  sanitizeArray: <T>(
    input: any, 
    itemSanitizer: (item: any) => T,
    maxLength: number = 100
  ): T[] => {
    if (!Array.isArray(input)) return [];
    
    return input
      .slice(0, maxLength)
      .map(itemSanitizer)
      .filter(item => item !== null && item !== undefined);
  }
};

/**
 * 权限验证
 */
export const permissionValidator = {
  /**
   * 检查用户是否有权限访问资源
   */
  canAccessResource: (user: User, resourceType: string, resourceId: string): boolean => {
    if (!user || !user.uid) return false;
    
    // 超级管理员
    if (user.email === 'admin@lexicon.com') return true;
    
    // 基本权限检查
    switch (resourceType) {
      case 'wordbook':
        return true; // 所有登录用户都可以访问词书
      case 'study_record':
        return true; // 用户可以访问自己的学习记录
      case 'user_settings':
        return true; // 用户可以访问自己的设置
      default:
        return false;
    }
  },

  /**
   * 检查用户是否可以修改资源
   */
  canModifyResource: (user: User, resourceType: string, resourceOwnerId: string): boolean => {
    if (!user || !user.uid) return false;
    
    // 超级管理员
    if (user.email === 'admin@lexicon.com') return true;
    
    // 只能修改自己的资源
    return user.uid === resourceOwnerId;
  }
};

/**
 * 安全中间件
 */
export const securityMiddleware = {
  /**
   * 验证请求数据
   */
  validateRequestData: (data: any, schema: any): {
    isValid: boolean;
    errors: string[];
    sanitizedData: any;
  } => {
    const errors: string[] = [];
    const sanitizedData: any = {};
    
    try {
      // 基本验证逻辑
      for (const [key, value] of Object.entries(data)) {
        if (schema[key]) {
          const fieldSchema = schema[key];
          
          // 必填验证
          if (fieldSchema.required && (value === null || value === undefined || value === '')) {
            errors.push(`${key} 为必填项`);
            continue;
          }
          
          // 类型验证
          if (value !== null && value !== undefined) {
            if (fieldSchema.type === 'string') {
              sanitizedData[key] = inputSanitizer.sanitizeString(value as string, fieldSchema.maxLength);
            } else if (fieldSchema.type === 'number') {
              sanitizedData[key] = inputSanitizer.sanitizeNumber(value, fieldSchema.min, fieldSchema.max);
            } else if (fieldSchema.type === 'boolean') {
              sanitizedData[key] = inputSanitizer.sanitizeBoolean(value);
            } else if (fieldSchema.type === 'array') {
              sanitizedData[key] = inputSanitizer.sanitizeArray(value, fieldSchema.itemSanitizer, fieldSchema.maxLength);
            }
            
            // XSS检查
            if (fieldSchema.type === 'string' && xssProtection.detectXSS(value as string)) {
              errors.push(`${key} 包含不安全内容`);
            }
          }
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        sanitizedData
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ['数据验证失败'],
        sanitizedData: {}
      };
    }
  },

  /**
   * 限制请求频率
   */
  rateLimit: (() => {
    const requests = new Map<string, number[]>();
    
    return (identifier: string, maxRequests: number = 60, windowMs: number = 60000): boolean => {
      const now = Date.now();
      const windowStart = now - windowMs;
      
      if (!requests.has(identifier)) {
        requests.set(identifier, []);
      }
      
      const userRequests = requests.get(identifier)!;
      
      // 清理过期请求
      const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
      
      if (validRequests.length >= maxRequests) {
        return false; // 超过限制
      }
      
      // 添加当前请求
      validRequests.push(now);
      requests.set(identifier, validRequests);
      
      return true; // 允许请求
    };
  })()
};

/**
 * 安全日志记录
 */
export const securityLogger = {
  /**
   * 记录安全事件
   */
  logSecurityEvent: (event: {
    type: 'login' | 'logout' | 'failed_login' | 'xss_attempt' | 'rate_limit' | 'permission_denied';
    user?: string;
    ip?: string;
    userAgent?: string;
    details?: any;
  }) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...event,
      details: sensitiveDataFilter.filterSensitiveData(event.details)
    };
    
    // 开发环境输出到控制台
    if (process.env.NODE_ENV === 'development') {
      console.log('🔒 Security Event:', logEntry);
    }
    
    // 生产环境发送到日志服务
    if (process.env.NODE_ENV === 'production') {
      // 这里可以集成第三方日志服务
      // 例如：发送到监控服务、日志聚合系统等
    }
  }
};

/**
 * 密码加密工具
 */
export const passwordUtils = {
  /**
   * 生成随机盐值
   */
  generateSalt: (): string => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  /**
   * 哈希密码
   */
  hashPassword: async (password: string, salt: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * 验证密码
   */
  verifyPassword: async (password: string, hash: string, salt: string): Promise<boolean> => {
    const computedHash = await passwordUtils.hashPassword(password, salt);
    return computedHash === hash;
  }
};

// 导出安全工具集合
export default {
  validation,
  xssProtection,
  sensitiveDataFilter,
  inputSanitizer,
  permissionValidator,
  securityMiddleware,
  securityLogger,
  passwordUtils
};