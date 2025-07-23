import { app } from '../utils/cloudbase';
import { parseCSV, parseJSON, WordData, WordbookData } from '../utils/fileUtils';

export interface UploadResult {
  success: boolean;
  message: string;
  data?: {
    wordbookId: string;
    wordCount: number;
  };
  error?: string;
}

export interface UploadProgress {
  progress: number;
  status: 'uploading' | 'success' | 'error';
  message?: string;
  currentStep?: string;
}

export class UploadService {
  private onProgress?: (progress: UploadProgress) => void;

  constructor(onProgress?: (progress: UploadProgress) => void) {
    this.onProgress = onProgress;
  }

  private updateProgress(progress: number, message?: string, currentStep?: string) {
    if (this.onProgress) {
      this.onProgress({
        progress,
        status: 'uploading',
        message,
        currentStep
      });
    }
  }

  private notifySuccess(message: string) {
    if (this.onProgress) {
      this.onProgress({
        progress: 100,
        status: 'success',
        message
      });
    }
  }

  private notifyError(message: string) {
    if (this.onProgress) {
      this.onProgress({
        progress: 0,
        status: 'error',
        message
      });
    }
  }

  async uploadWordbook(file: File): Promise<UploadResult> {
    try {
      this.updateProgress(0, '开始处理文件...', '准备上传');

      // 1. 读取文件内容
      const content = await this.readFileContent(file);
      this.updateProgress(25, '文件读取完成', '解析文件');

      // 2. 解析文件内容
      let wordbookData: WordbookData;
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (fileExtension === '.csv') {
        const words = parseCSV(content);
        wordbookData = {
          name: file.name.replace('.csv', ''),
          description: `从CSV文件导入，包含${words.length}个单词`,
          words
        };
      } else if (fileExtension === '.json') {
        wordbookData = parseJSON(content);
      } else {
        throw new Error('不支持的文件格式');
      }

      this.updateProgress(50, '数据解析完成', '验证数据');

      // 3. 验证数据
      this.validateWordbookData(wordbookData);
      this.updateProgress(75, '数据验证通过', '上传到服务器');

      // 4. 调用云函数上传数据
      const result = await app.callFunction({
        name: 'upload-wordbook',
        data: {
          wordbookData
        }
      });

      this.updateProgress(100, '处理完成', '完成');

      if (result.result?.success) {
        this.notifySuccess(
          `词书「${wordbookData.name}」上传成功！共导入${wordbookData.words.length}个单词`
        );
        
        return {
          success: true,
          message: '上传成功',
          data: {
            wordbookId: result.result.data?.wordbookId,
            wordCount: wordbookData.words.length
          }
        };
      } else {
        const errorMessage = result.result?.error || '上传失败';
        this.notifyError(errorMessage);
        return {
          success: false,
          message: errorMessage
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上传过程中发生未知错误';
      this.notifyError(errorMessage);
      return {
        success: false,
        message: errorMessage,
        error: errorMessage
      };
    }
  }

  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('文件读取失败'));
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  private validateWordbookData(data: WordbookData) {
    if (!data.name || !data.name.trim()) {
      throw new Error('词书名称不能为空');
    }

    if (!data.words || !Array.isArray(data.words)) {
      throw new Error('词书必须包含单词数组');
    }

    if (data.words.length === 0) {
      throw new Error('词书不能为空');
    }

    if (data.words.length > 10000) {
      throw new Error('单次上传不能超过10000个单词');
    }

    // 验证每个单词的数据
    const invalidWords: string[] = [];
    const duplicateWords: string[] = [];
    const wordSet = new Set<string>();

    for (let i = 0; i < data.words.length; i++) {
      const word = data.words[i];
      
      // 检查必需字段
      if (!word.word || !word.word.trim()) {
        invalidWords.push(`第${i + 1}行：单词不能为空`);
        continue;
      }

      if (!word.meaning || !word.meaning.trim()) {
        invalidWords.push(`第${i + 1}行：释义不能为空`);
        continue;
      }

      // 检查重复单词
      const wordKey = word.word.toLowerCase().trim();
      if (wordSet.has(wordKey)) {
        duplicateWords.push(`第${i + 1}行：单词「${word.word}」重复`);
      } else {
        wordSet.add(wordKey);
      }

      // 验证单词格式
      if (word.word.length > 100) {
        invalidWords.push(`第${i + 1}行：单词长度不能超过100字符`);
      }

      if (word.meaning.length > 500) {
        invalidWords.push(`第${i + 1}行：释义长度不能超过500字符`);
      }

      if (word.example && word.example.length > 1000) {
        invalidWords.push(`第${i + 1}行：例句长度不能超过1000字符`);
      }
    }

    if (invalidWords.length > 0) {
      throw new Error(`数据验证失败：\n${invalidWords.slice(0, 5).join('\n')}${invalidWords.length > 5 ? '\n...' : ''}`);
    }

    if (duplicateWords.length > 0) {
      throw new Error(`发现重复单词：\n${duplicateWords.slice(0, 5).join('\n')}${duplicateWords.length > 5 ? '\n...' : ''}`);
    }
  }

  // 获取上传历史记录
  async getUploadHistory(): Promise<any[]> {
    try {
      const result = await app.callFunction({
        name: 'upload-wordbook',
        data: {
          action: 'getHistory'
        }
      });

      if (result.result?.success) {
        return result.result.data || [];
      }
      return [];
    } catch (error) {
      console.error('获取上传历史失败:', error);
      return [];
    }
  }

  // 删除上传的词书
  async deleteWordbook(wordbookId: string): Promise<boolean> {
    try {
      const result = await app.callFunction({
        name: 'upload-wordbook',
        data: {
          action: 'delete',
          wordbookId
        }
      });

      return result.result?.success || false;
    } catch (error) {
      console.error('删除词书失败:', error);
      return false;
    }
  }
}