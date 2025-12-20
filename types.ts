
export interface Platform {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  color: string;
}

export type PlatformType = 'Telegram' | 'WhatsApp' | 'Discord' | 'X' | 'Facebook' | 'Instagram' | 'LinkedIn' | 'TikTok' | 'Reddit';

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
    specialty?: string;
  };
  source: {
    name: string;
    uri: string;
    type: 'Search' | 'Mention' | 'Directory' | 'Direct';
    context?: string; // Where exactly this link was mentioned
  };
  timestamp: string;
}

export interface IntelMessage {
  id: string;
  content: string;
  author: string;
  platform: PlatformType;
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
    medicalMatches: number;
  };
}

export type SearchType = 'topic' | 'user-id' | 'signal-phone' | 'medical-recon' | 'deep-scan' | 'mention-tracker';

export interface SearchParams {
  query: string;
  location: string;
  town?: string;
  hospital?: string;
  specialty?: string;
  platforms: PlatformType[]; // Updated to strictly follow selected platforms
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
