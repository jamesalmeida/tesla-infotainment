import type { Conversation } from '../../../apps/phoneData';
import { safeStorage } from '../../../utils/safeStorage';

const STORAGE_KEY = 'tesla-messages-read';

export const loadRead = (): string[] => {
  try {
    const parsed: unknown = JSON.parse(safeStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

export const saveRead = (ids: string[]) => safeStorage.setItem(STORAGE_KEY, JSON.stringify(ids));

export const unreadCount = ({ messages }: Conversation, read: string[]): number =>
  messages.filter((message) => !message.fromMe && !read.includes(message.id)).length;

// Newest conversation first.
export const sortConversations = (conversations: Conversation[]): Conversation[] => {
  const latest = (conversation: Conversation) =>
    Math.min(...conversation.messages.map((message) => message.minutesAgo));
  return [...conversations].sort((a, b) => latest(a) - latest(b));
};

export const formatAgo = (minutes: number): string => {
  if (minutes < 1) return 'Now';
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)} hr ago`;
};

// What gets read out: who it's from first, as a driver can't look at the screen.
export const readOutText = (sender: string, text: string): string => `${sender} says: ${text}`;
