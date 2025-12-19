export interface Platform {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  color: string;
}

export interface TelegramGroup {
  id: string;
  title: string;
  description: string;
  url: string;
  category?: string;
  isPrivate: boolean;
  isProfessional?: boolean;
  platformSource: string;
  linkType: 'Telegram' | 'WhatsApp';
  country?: string;
  language?: string;
  timestamp: string;
  confidenceScore: number;
}

export interface SearchHistoryItem {
  query: string;
  timestamp: string;
  type: SearchType;
}

export interface SearchResult {
  text: string;
  sources: Array<{ title: string; uri: string }>;
  parsedGroups: TelegramGroup[];
  summary?: {
    totalDetected: number;
    privateRatio: string;
    riskLevel: 'Low' | 'Medium' | 'High';
  };
}

export type SearchMode = 'quick' | 'deep';
export type SearchType = 'topic' | 'user';

export interface SearchParams {
  query: string;
  country: string;
  language: string;
  category: string;
  platforms: string[];
  mode: SearchMode;
  searchType: SearchType;
}

// تعريف بسيط لإسكات أخطاء TypeScript المتعلقة بـ process.env
declare global {
  interface Window {
    process: {
      env: {
        API_KEY?: string;
        [key: string]: any;
      };
    };
  }
}
