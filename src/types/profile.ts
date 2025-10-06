export interface UserProfile {
  id: string;
  name: string;
  avatar: string; // emoji veya base64 image
  bio: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  totalTodos: number;
  completedTodos: number;
  totalNotes: number;
  daysActive: number;
  lastActiveDate: string;
}

export interface ProfileData {
  profile: UserProfile;
  stats: UserStats;
}

export const DEFAULT_AVATARS = [
  '😊', '🎨', '🚀', '💡', '🌟', '🎯', '📚', '🎵',
  '🌈', '⚡', '🔥', '✨', '🌸', '🦋', '🎭', '🎪'
];
