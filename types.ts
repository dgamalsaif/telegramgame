
export type PlatformType = 'Telegram' | 'WhatsApp' | 'Discord' | 'X' | 'Facebook' | 'Instagram' | 'LinkedIn' | 'TikTok' | 'Signal' | 'Reddit';

export interface Platform {
  id: string;
  name: PlatformType;
  icon: string;
  connected: boolean;
  color: string;
}

export interface IntelligenceSignal {
  id: string;
  title: string;
  url: string;
  platform: PlatformType;
  type: 'Private Group' | 'Public Group' | 'Channel' | 'Server' | 'Community' | 'Leaked Thread';
  description: string;
  context?: string; // Surround text or snippet
  sharedBy?: string; // Originator or indexing site
  originSource?: string; // Specific archive or document name
  isPrivate: boolean;
  securityLevel: 'Low' | 'Medium' | 'High' | 'Classified';
  confidenceScore: number;
  status: 'Active' | 'Unverified' | 'Expired';
  timestamp: string;
  location: string;
}

export interface SearchResult {
  analysis: string;
  signals: IntelligenceSignal[];
  groundingSources: Array<{ title: string; uri: string }>;
  summary: {
    totalDetected: number;
    privateSignals: number;
    signalStrength: number;
  };
}

export interface SearchParams {
  query: string;
  platforms: PlatformType[];
  searchType: 'discovery' | 'deep-scan' | 'leaks' | 'identity-trace';
  location: string;
  identities: string[];
}
