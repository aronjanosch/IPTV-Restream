export interface User {
  id: number;
  email: string;
  name: string;
  username?: string;
  avatar?: string;
  role: 'admin' | 'user';
}

export interface AuthResponse {
  authenticated: boolean;
  user?: User;
}


export type ChannelMode = 'direct' | 'proxy' | 'restream';

export interface Channel {
  id: number;
  name: string;
  url: string;
  avatar: string;
  mode: ChannelMode;
  headers: CustomHeader[];
  group: string;
  playlist: string;
  playlistName: string;
  playlistUpdate: boolean;
}

export interface ChatMessage {
  id: number;
  user: User;
  message: string;
  timestamp: string;
}


export interface CustomHeader {
  key: string;
  value: string;
}

export type ToastType = 'info' | 'success' | 'error' | 'loading';

export interface ToastNotification {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration: number;
}