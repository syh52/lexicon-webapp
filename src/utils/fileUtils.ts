// 文件处理工具函数
export interface WordData {
  word: string;
  phonetic?: string;
  meaning: string;
  example?: string;
  pos?: string; // 词性
  audioUrl?: string;
}

export interface WordbookData {
  name: string;
  description: string;
  words: WordData[];
}

// 解析CSV文件
export function parseCSV(csvContent: string): WordData[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV文件格式错误：至少需要标题行和一行数据');
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const requiredHeaders = ['word', 'meaning'];
  
  // 检查必需的列是否存在
  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      throw new Error(`CSV文件缺少必需的列：${required}`);
    }
  }

  return lines.slice(1).map((line, index) => {
    const values = line.split(',').map(v => v.trim());
    const word: WordData = {
      word: '',
      meaning: ''
    };
    
    headers.forEach((header, i) => {
      const value = values[i] || '';
      switch (header) {
        case 'word':
          word.word = value;
          break;
        case 'phonetic':
          word.phonetic = value;
          break;
        case 'meaning':
          word.meaning = value;
          break;
        case 'example':
          word.example = value;
          break;
        case 'pos':
          word.pos = value;
          break;
        case 'audioUrl':
          word.audioUrl = value;
          break;
      }
    });

    // 验证必需字段
    if (!word.word || !word.meaning) {
      throw new Error(`第${index + 2}行数据不完整：word和meaning为必填字段`);
    }

    // 如果没有audioUrl，自动生成
    if (!word.audioUrl) {
      word.audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word.word)}&type=1`;
    }

    return word;
  });
}

// 解析JSON文件
export function parseJSON(jsonContent: string): WordbookData {
  try {
    const data = JSON.parse(jsonContent);
    
    // 验证JSON结构
    if (!data.name || !data.words || !Array.isArray(data.words)) {
      throw new Error('JSON文件格式错误：需要包含name和words数组');
    }

    // 验证每个单词的结构
    for (let i = 0; i < data.words.length; i++) {
      const word = data.words[i];
      if (!word.word || !word.meaning) {
        throw new Error(`第${i + 1}个单词数据不完整：word和meaning为必填字段`);
      }
      
      // 自动生成audioUrl
      if (!word.audioUrl) {
        word.audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word.word)}&type=1`;
      }
    }

    return data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('JSON文件格式错误：请检查语法');
    }
    throw error;
  }
}

// 验证文件类型
export function validateFileType(file: File): boolean {
  const allowedTypes = [
    'text/csv',
    'application/json',
    'text/plain' // 有些系统可能将CSV识别为text/plain
  ];
  
  const allowedExtensions = ['.csv', '.json'];
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  
  return allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);
}

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 生成示例CSV内容
export function generateSampleCSV(): string {
  return `word,phonetic,meaning,example,pos
apple,/ˈæpəl/,苹果,I like to eat apples.,n.
book,/bʊk/,书,She is reading a book.,n.
run,/rʌn/,跑步,I run every morning.,v.
beautiful,/ˈbjuːtɪfəl/,美丽的,She is beautiful.,adj.
quickly,/ˈkwɪkli/,快速地,He runs quickly.,adv.`;
}

// 生成示例JSON内容
export function generateSampleJSON(): string {
  return JSON.stringify({
    name: "示例词书",
    description: "这是一个示例词书，包含常用英语单词",
    words: [
      {
        word: "apple",
        phonetic: "/ˈæpəl/",
        meaning: "苹果",
        example: "I like to eat apples.",
        pos: "n."
      },
      {
        word: "book",
        phonetic: "/bʊk/",
        meaning: "书",
        example: "She is reading a book.",
        pos: "n."
      },
      {
        word: "run",
        phonetic: "/rʌn/",
        meaning: "跑步",
        example: "I run every morning.",
        pos: "v."
      }
    ]
  }, null, 2);
}