
export interface Platform {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  color: string;
}

export type PlatformType = 'Telegram' | 'WhatsApp' | 'Discord' | 'X' | 'Facebook' | 'Instagram' | 'LinkedIn' | 'TikTok';

export interface IntelLink {
  id: string;
  title: string;
  description: string;
  url: string;
  isPrivate: boolean;
  isActive: boolean;
  platform: PlatformType;
  confidence: number;
  location: {
    country: string;
    town?: string;
    hospital?: string;
  };
  source: {
    name: string;
    uri: string;
    type: 'Search' | 'Leaked' | 'Directory' | 'Direct';
  };
  timestamp: string;
}

export interface IntelMessage {
  id: string;
  content: string;
  author: string;
  platform: PlatformType;
  date: string;
  sourceGroup: string;
  sourceUrl?: string;
  relevance: number;
}

export interface SearchResult {
  analysis: string;
  links: IntelLink[];
  messages: IntelMessage[];
  sources: Array<{ title: string; uri: string }>;
  stats: {
    totalFound: number;
    privateCount: number;
    activeCount: number;
    hospitalMatches: number;
    hiddenMatches: number;
  };
}

export type SearchType = 'topic' | 'user-id' | 'signal-phone' | 'medical-scan' | 'deep-scan';

export interface SearchParams {
  query: string;
  location: string;
  town?: string;
  hospital?: string;
  platforms: Platform[];
  searchType: SearchType;
  filters: {
    activeOnly: boolean;
    privateOnly: boolean;
    minConfidence: number;
  };
}

export interface SearchHistoryItem {
  query: string;
  location: string;
  town?: string;
  hospital?: string;
  timestamp: string;
  type: SearchType;
}