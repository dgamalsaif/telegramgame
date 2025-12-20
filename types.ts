
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
  };
  source: {
    name: string;
    uri: string;
    type: 'Search' | 'Mention' | 'Directory' | 'Direct';
    context?: string;
  };
  timestamp: string;
}

export interface SearchResult {
  analysis: string;
  links: IntelLink[];
  messages: any[];
  sources: Array<{ title: string; uri: string }>;
  stats: {
    totalFound: number;
    privateCount: number;
    activeCount: number;
    medicalMatches: number;
  };
}

export type SearchType = 'topic' | 'medical-recon' | 'deep-scan' | 'mention-tracker';

export interface SearchParams {
  query: string;
  location: string;
  specialty?: string;
  platforms: PlatformType[];
  searchType: SearchType;
  filters: {
    activeOnly: boolean;
    privateOnly: boolean;
    minConfidence: number;
  };
}
