import React from 'react';
import { BookOpen, Volume2, Eye, EyeOff } from 'lucide-react';
import { WordData, WordbookData } from '../../utils/fileUtils';

interface DataPreviewProps {
  data: WordData[] | WordbookData;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export default function DataPreview({ data, isExpanded, onToggleExpand }: DataPreviewProps) {
  // 确定数据类型和提取单词列表
  const isWordbook = 'words' in data;
  const words = isWordbook ? data.words : data;
  const wordbookName = isWordbook ? data.name : '上传的词汇';
  const wordbookDescription = isWordbook ? data.description : `包含 ${words.length} 个单词`;

  // 预览显示的单词数量
  const previewCount = isExpanded ? words.length : Math.min(5, words.length);
  const displayWords = words.slice(0, previewCount);

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{wordbookName}</h3>
            <p className="text-gray-400 text-sm">{wordbookDescription}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">共 {words.length} 个单词</span>
          <button
            onClick={onToggleExpand}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            {isExpanded ? (
              <EyeOff className="h-4 w-4 text-gray-400" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {displayWords.map((word, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-gray-600/20 hover:bg-white/10 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h4 className="text-white font-medium">{word.word}</h4>
                {word.phonetic && (
                  <span className="text-purple-400 text-sm font-mono">
                    {word.phonetic}
                  </span>
                )}
                {word.pos && (
                  <span className="px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded">
                    {word.pos}
                  </span>
                )}
              </div>
              
              <p className="text-gray-300 text-sm mb-2">{word.meaning}</p>
              
              {word.example && (
                <p className="text-gray-400 text-xs italic">
                  例句: {word.example}
                </p>
              )}
            </div>
            
            {word.audioUrl && (
              <button
                onClick={() => {
                  const audio = new Audio(word.audioUrl);
                  audio.play().catch(console.error);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="播放发音"
              >
                <Volume2 className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>
        ))}
      </div>

      {!isExpanded && words.length > 5 && (
        <div className="mt-4 text-center">
          <button
            onClick={onToggleExpand}
            className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
          >
            展开查看全部 {words.length} 个单词
          </button>
        </div>
      )}

      {isExpanded && words.length > 5 && (
        <div className="mt-4 text-center">
          <button
            onClick={onToggleExpand}
            className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
          >
            收起
          </button>
        </div>
      )}
    </div>
  );
}