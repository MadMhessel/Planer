export type AssistantStatus = 'online' | 'offline';

export interface PersonalitySettings {
  formality: number;
  expertise: number;
  tone: number;
  creativity: number;
  humor: number;
  voiceSpeed: number;
}

export interface Assistant {
  id: string;
  name: string;
  role: string;
  updatedAt: string;
  status: AssistantStatus;
  avatar?: string;
}

export type KnowledgeFileStatus = 'indexed' | 'processing' | 'queued' | 'failed';
export type KnowledgeFileType = 'PDF' | 'DOCX' | 'TXT' | 'CSV' | 'URL';

export interface KnowledgeFile {
  id: string;
  name: string;
  type: KnowledgeFileType;
  size: string;
  pages: string;
  uploadedAt: string;
  status: KnowledgeFileStatus;
}

export interface ChunkSettings {
  chunkSize: number;
  overlap: number;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected';
  lastSync: string;
  icon: string;
  color: string;
}

export interface KPI {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down';
  icon: 'messages' | 'timer' | 'send' | 'star';
}

export interface MetricPoint {
  name: string;
  value: number;
}

export interface IntentPoint {
  name: string;
  value: number;
  color: string;
}

export interface Channel {
  id: string;
  name: string;
  handle: string;
  connected: boolean;
  preview: string;
}
