export interface Track {
  id: string;
  youtubeId: string;
  title: string;
  artist: string;
  album: string;
  year: number | string;
  trackNumber: string; // e.g. "Track 02", "Pista 02", "Lado A • 01"
  side: 'A' | 'B';
  duration: number; // in seconds
  coverUrl: string;
  genre: string;
  lyrics: string;
  customNotes?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  trackIds: string[];
  createdAt: number;
  color?: string; // 'amber' | 'emerald' | 'cyan' | 'rose' | 'purple';
}

export type ViewTab = 'video' | 'cover' | 'lyrics' | 'pdf';

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isLooping: boolean;
  isShuffling: boolean;
}
