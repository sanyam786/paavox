// Agents
export type AgentType = 'caption' | 'repurpose' | 'trend';

export type AgentStatus = 'idle' | 'running' | 'completed' | 'error';

export interface AgentRun {
  id: string;
  agentType: AgentType;
  status: AgentStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

// Content
export type Platform = 'instagram' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'facebook';

export interface ContentItem {
  id: string;
  userId: string;
  platform: Platform;
  type: 'caption' | 'repurposed' | 'trend-based';
  content: string;
  hashtags: string[];
  originalContent?: string;
  agentRunId: string;
  createdAt: string;
  scheduledAt?: string;
  publishedAt?: string;
}

// Caption Agent
export interface CaptionInput {
  content: string;
  platform: Platform;
  tone?: string;
  includeHashtags?: boolean;
  includeEmojis?: boolean;
}

export interface CaptionOutput {
  caption: string;
  hashtags: string[];
  characterCount: number;
  platform: Platform;
}

// Repurposing Agent
export interface RepurposeInput {
  content: string;
  sourcePlatform: Platform;
  targetPlatform: Platform;
  preserveTone?: boolean;
}

export interface RepurposeOutput {
  repurposedContent: string;
  changes: string[];
  platform: Platform;
}

// Trend Agent
export interface TrendInput {
  niche: string;
  platforms?: Platform[];
  timeframe?: '24h' | '7d' | '30d';
}

export interface TrendTopic {
  topic: string;
  score: number;
  platforms: Platform[];
  contentIdeas: string[];
  hashtags: string[];
}

export interface TrendOutput {
  trends: TrendTopic[];
  niche: string;
  generatedAt: string;
}
