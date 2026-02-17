export interface Signal {
  id: string;
  hash: string;
  author: {
    fid: number;
    username: string;
    displayName: string;
    pfpUrl: string;
  };
  text: string;
  summary: string;
  translatedSummary?: string;
  channel: string;
  score: number;
  heat: 'red' | 'yellow' | 'green';
  communityReactions?: {
    username: string;
    followers: number;
    text: string;
    translatedText?: string | null;
    isKol: boolean;
    hash: string;
  }[];
  likes: number;
  replies: number;
  recasts: number;
  timestamp: string;
  originalUrl: string;
  images: string[];
  quotedCast?: {
    hash: string;
    author: {
      username: string;
      displayName: string;
      pfpUrl: string;
    };
    text: string;
  } | null;
}

export type Language = 'en' | 'zh' | 'ja' | 'ko' | 'fa';

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  fa: 'فارسی',
};

export const CHANNELS = ['dev', 'ai', 'miniapps', 'build'] as const;
