export enum Persona {
  SmartGPT = 'SmartGPT',
  BusinessGPT = 'BusinessGPT',
  EducationGPT = 'EducationGPT'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text?: string;
  image?: string;
  videoUrl?: string;
  audioUrl?: string;
  timestamp: number;
  isLoading?: boolean;
  groundingUrls?: Array<{uri: string, title: string}>;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  persona: Persona;
  lastUpdated: number;
}

export interface User {
  name: string;
  email: string;
  picture: string;
}

export interface GenerateConfig {
  persona: Persona;
  imageSize?: '1K' | '2K' | '4K';
  aspectRatio?: string;
  videoAspectRatio?: '16:9' | '9:16';
}