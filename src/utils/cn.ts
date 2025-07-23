import { type ClassValue, clsx } from 'clsx';

/**
 * 工具函数用于合并CSS类名
 * 支持条件类名和去重
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}