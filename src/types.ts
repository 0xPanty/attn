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

export type Language = 'en' | 'zh' | 'ja' | 'ko' | 'es' | 'fr';

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  es: 'Español',
  fr: 'Français',
};

export const CHANNELS = ['dev', 'ai', 'miniapps', 'build'] as const;
