
export interface Platform {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  color: string;
}

export type PlatformType = 
  | 'Telegram' 
  | 'WhatsApp' 
  | 'Discord' 
  | 'X' 
  | 'Facebook' 
  | 'Instagram' 
  | 'LinkedIn' 
  | 'Reddit' 
  | 'TikTok' 
  | 'Signal';

export type SearchMode = 'discovery' | 'username' | 'phone' | 'medical-residency';

export interface ConnectedIdentity {
  platform: PlatformType;
  type: 'phone' | 'email' | 'handle';
  value: string;
  verifiedAt: string;
}

export interface IntelLink {
  id: string;
  title: string;
  description: string;
  url: string;
  platform: PlatformType;
  type: 'Group' | 'Channel' | 'Profile' | 'Bot' | 'Thread';
  status: 'Active' | 'Unknown' | 'Revoked';
  members?: string;
  location?: string;
  confidence: number;
  source: string;
  tags: string[];
}

export interface SearchResult {
  analysis: string;
  links: IntelLink[];
  stats: {
    total: number;
    platformDistribution: Record<string, number>;
    topLocations: string[];
  };
}

export interface SearchParams {
  query: string;
  mode: SearchMode;
  platforms: PlatformType[];
  identities: ConnectedIdentity[]; // New: List of connected user accounts
  location?: {
    country?: string;
    city?: string;
    institution?: string; 
  };
  medicalContext?: {
    specialty?: string;
    level?: string;
  };
}
