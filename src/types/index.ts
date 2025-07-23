// 用户相关类型定义
export interface User {
  uid: string;
  displayName: string;
  username: string;
  email: string;
  avatar?: string;
  phone?: string;
  bio?: string;
  isAdmin?: boolean;
  isAnonymous?: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  language?: 'zh-CN' | 'en-US';
  notifications?: boolean;
  soundEnabled?: boolean;
  dailyGoal?: number;
  studyReminder?: boolean;
  reminderTime?: string;
}

// 词书相关类型定义
export interface Wordbook {
  _id: string;
  title: string;
  description?: string;
  language: string;
  level: string;
  totalWords: number;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  createdBy: string;
  coverImage?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  category?: string;
}

// 单词相关类型定义
export interface Word {
  _id: string;
  word: string;
  meanings: WordMeaning[];
  pronunciation?: string;
  phonetic?: string;
  audioUrl?: string;
  pos?: string; // part of speech
  meaning?: string; // 简化的释义
  example?: string;
  level?: string;
  frequency?: number;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WordMeaning {
  partOfSpeech: string;
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
  translation?: string;
}

// 学习卡片类型定义
export interface StudyCard {
  _id: string;
  word: string;
  meanings: WordMeaning[];
  pronunciation?: string;
  originalWord: Word;
}

// FSRS 算法相关类型定义
export interface FSRSCard {
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: CardState;
  lastReview?: Date;
}

export enum CardState {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3,
}

export enum Rating {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4,
}

export interface ReviewLog {
  rating: Rating;
  state: CardState;
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  lastElapsedDays: number;
  scheduledDays: number;
  review: Date;
}

// 学习记录类型定义
export interface StudyRecord {
  _id?: string;
  uid: string;
  wordId: string;
  wordbookId: string;
  stage: number;
  nextReview: Date;
  failures: number;
  successes: number;
  lastReview?: Date;
  status: 'new' | 'learning' | 'review' | 'graduated';
  createdAt: Date;
  updatedAt?: Date;
  fsrsCard?: FSRSCard;
  reviewLogs?: ReviewLog[];
}

// 每日学习计划类型定义
export interface DailyStudyPlan {
  _id?: string;
  uid: string;
  wordbookId: string;
  date: string; // YYYY-MM-DD format
  plannedWords: string[]; // word IDs
  completedWords: string[];
  totalCount: number;
  completedCount: number;
  currentIndex: number;
  newWordsCount: number;
  reviewWordsCount: number;
  stats: DailyStudyStats;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface DailyStudyStats {
  knownCount: number;
  unknownCount: number;
  accuracy: number;
  studyTime: number; // 学习时间(分钟)
  averageResponseTime: number; // 平均反应时间(秒)
}

// 学习进度类型定义
export interface StudyProgress {
  wordId: string;
  isKnown: boolean;
  studyTime: number;
  timestamp: Date;
  responseTime?: number;
}

// 学习会话类型定义
export interface StudySession {
  plan: DailyStudyPlan;
  cards: StudyCard[];
  currentCard: StudyCard | null;
  wordsMap: Map<string, Word>;
  isCompleted: boolean;
}

// 用户设置类型定义
export interface UserSettings {
  _id?: string;
  uid: string;
  dailyNewWords: number;
  dailyReviewWords: number;
  studyMode: 'easy' | 'normal' | 'hard';
  notifications: boolean;
  soundEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  language: 'zh-CN' | 'en-US';
  fsrsConfig?: FSRSConfig;
  createdAt: Date;
  updatedAt?: Date;
}

export interface FSRSConfig {
  requestRetention: number;
  maximumInterval: number;
  w: number[];
  enableFuzz: boolean;
}

// 统计数据类型定义
export interface StudyStatistics {
  totalWords: number;
  studiedWords: number;
  masteredWords: number;
  accuracy: number;
  studyStreak: number;
  totalStudyTime: number;
  weeklyStats: WeeklyStats[];
  monthlyStats: MonthlyStats[];
  levelDistribution: LevelDistribution[];
}

export interface WeeklyStats {
  week: string;
  studiedWords: number;
  accuracy: number;
  studyTime: number;
}

export interface MonthlyStats {
  month: string;
  studiedWords: number;
  accuracy: number;
  studyTime: number;
}

export interface LevelDistribution {
  level: string;
  count: number;
  percentage: number;
}

// API 响应类型定义
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// 云函数响应类型定义
export interface CloudFunctionResponse<T = any> {
  result: ApiResponse<T>;
  requestId: string;
}

// 上传文件相关类型定义
export interface UploadFileData {
  word: string;
  pos?: string;
  meaning: string;
  example?: string;
  phonetic?: string;
  level?: string;
  frequency?: number;
  tags?: string[];
}

export interface UploadProgress {
  uploaded: number;
  total: number;
  percentage: number;
  currentFile?: string;
  errors?: string[];
}

// 组件 Props 类型定义
export interface StudyCardProps {
  card: StudyCard;
  showAnswer: boolean;
  onShowAnswer: () => void;
  onRating: (isKnown: boolean) => void;
  current: number;
  total: number;
  onBack: () => void;
  scheduler: any;
}

export interface StudyProgressProps {
  current: number;
  total: number;
  stats: DailyStudyStats;
}

export interface StudyStatsProps {
  stats: StudyStatistics;
}

// 路由相关类型定义
export interface RouteParams {
  id?: string;
  wordbookId?: string;
  userId?: string;
}

// 表单类型定义
export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  acceptTerms: boolean;
}

export interface SettingsFormData {
  displayName: string;
  email: string;
  phone?: string;
  bio?: string;
  dailyNewWords: number;
  dailyReviewWords: number;
  studyMode: 'easy' | 'normal' | 'hard';
  notifications: boolean;
  soundEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  language: 'zh-CN' | 'en-US';
}

// 错误类型定义
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// 消息类型定义
export interface Message {
  type: 'success' | 'error' | 'warning' | 'info';
  text: string;
  duration?: number;
}

// 简化的单词记录类型（兼容现有代码）
export interface SimpleWordRecord {
  _id: string;
  word: string;
  stage: number;
  nextReview: Date;
  failures: number;
  successes: number;
  lastReview?: Date;
  status: 'new' | 'learning' | 'review' | 'graduated';
  createdAt: Date;
}

// 导出所有类型的联合类型
export type StudyStatus = 'new' | 'learning' | 'review' | 'graduated';
export type StudyMode = 'easy' | 'normal' | 'hard';
export type Theme = 'light' | 'dark' | 'system';
export type Language = 'zh-CN' | 'en-US';
export type MessageType = 'success' | 'error' | 'warning' | 'info';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

// 工具类型定义
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;