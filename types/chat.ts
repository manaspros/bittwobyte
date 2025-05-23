export interface User {
  id: string;
  username: string;
  isOnline?: boolean;
  lastSeen?: string;
}

export interface Message {
  id?: string;
  user: string;
  userId?: string;
  text: string;
  room?: string;
  recipientId?: string;
  timestamp: string;
  isPrivate?: boolean;
  reactions?: {
    [emoji: string]: string[]; // Emoji -> array of user IDs
  };
}

export interface Room {
  id: string;
  name: string;
  users: User[];
}

export interface TypingIndicator {
  userId: string;
  username: string;
  isTyping: boolean;
}

export interface PrivateChatInfo {
  room: string;
  withUser: User;
}
