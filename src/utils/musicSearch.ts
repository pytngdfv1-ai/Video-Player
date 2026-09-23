/**
 * Online music search & YouTube metadata detector
 */

import { upgradeArtworkResolution, cleanMusicQuery } from './coverArtFinder';

export interface OnlineSearchResult {
  id: string;
  title: string;
  artist: string;
  album: string;
  year?: number;
  genre?: string;
  duration: number; // in seconds
  coverUrl: string;
  thumbnailUrl: string;
  previewUrl?: string;
}

export interface YouTubeVideoInfo {
  videoId: string;
  title: string;
  author: string;
  thumbnailUrl: string;
  originalUrl: string;
}

/**
 * Extracts YouTube Video ID from any standard or mobile URL format
 */
export function extractYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Direct 11-char ID (e.g. "dQw4w9WgXcQ")
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // youtube.com/watch?v=...
  const vMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (vMatch) return vMatch[1];

  // youtu.be/...
  const beMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (beMatch) return beMatch[1];

  // youtube.com/shorts/...
  const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return shortsMatch[1];

  // youtube.com/embed/...
  const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  return null;
}

/**
 * Checks if a string looks like a YouTube URL or direct video ID
 */
export function isYouTubeInput(input: string): boolean {
  const trimmed = input.trim();
  return (
    trimmed.includes('youtube.com') ||
    trimmed.includes('youtu.be') ||
    /^[a-zA-Z0-9_-]{11}$/.test(trimmed)
  );
}

/**
 * Fetches real video metadata from YouTube via noembed or oEmbed
 */
export async function fetchYouTubeInfo(urlOrId: string): Promise<YouTubeVideoInfo | null> {
  const videoId = extractYouTubeId(urlOrId);
  if (!videoId) return null;

  const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const defaultThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  try {
    const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(targetUrl)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.title) {
        return {
          videoId,
          title: data.title || 'Video de YouTube',
          author: data.author_name || 'YouTube',
          thumbnailUrl: data.thumbnail_url || defaultThumbnail,
          originalUrl: targetUrl,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to fetch from noembed, using fallback:', e);
  }

  return {
    videoId,
    title: 'Video de YouTube',
    author: 'YouTube',
    thumbnailUrl: defaultThumbnail,
    originalUrl: targetUrl,
  };
}

/**
 * Searches online database (iTunes Music) for genuine songs, album covers, and metadata
 */
export async function searchOnlineTracks(query: string, limit = 12): Promise<OnlineSearchResult[]> {
  const clean = cleanMusicQuery(query);
  if (!clean || clean.length < 2) return [];

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(clean)}&entity=song&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) return [];

    return data.results.map((item: any) => {
      const rawArt = item.artworkUrl100 || item.artworkUrl60 || '';
      const highResArt = upgradeArtworkResolution(rawArt, 1000);
      const year = item.releaseDate ? new Date(item.releaseDate).getFullYear() : undefined;
      const duration = item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 240;

      return {
        id: `online-${item.trackId || Math.random().toString(36).substring(2, 9)}`,
        title: item.trackName || clean,
        artist: item.artistName || 'Artista',
        album: item.collectionName || 'Álbum',
        year,
        genre: item.primaryGenreName || 'Música',
        duration,
        coverUrl: highResArt || rawArt,
        thumbnailUrl: rawArt,
        previewUrl: item.previewUrl,
      };
    });
  } catch (err) {
    console.warn('Online music search error:', err);
    return [];
  }
}
