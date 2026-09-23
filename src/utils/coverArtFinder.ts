/**
 * Utility to search and fetch genuine, high-resolution original album covers
 * from official music databases (iTunes / Apple Music CDN).
 */

export interface CoverSearchResult {
  coverUrl: string;
  thumbnailUrl: string;
  album: string;
  artist: string;
  year?: number;
  genre?: string;
  releaseDate?: string;
}

// In-memory cache for fast lookups
const coverCache = new Map<string, CoverSearchResult>();

/**
 * Cleans YouTube and metadata clutter from title/artist for maximum search accuracy
 */
export function cleanMusicQuery(str: string): string {
  return str
    .replace(/[\(\[](official\s*(music\s*)?video|video\s*oficial|audio\s*oficial|visualizer|lyric\s*video|remaster(ed)?\s*\d*|hd|4k|hq)[\)\]]/gi, '')
    .replace(/\b(ft\.|feat\.|featuring)\b.*$/i, '')
    .replace(/["'«»]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Converts iTunes artwork thumbnail to full studio resolution (1000x1000 or 600x600)
 */
export function upgradeArtworkResolution(url: string, size = 1000): string {
  if (!url) return '';
  return url
    .replace(/\/\d+x\d+bb\.(jpg|png|webp)/i, `/${size}x${size}bb.jpg`)
    .replace(/\/\d+x\d+\.(jpg|png|webp)/i, `/${size}x${size}.jpg`);
}

/**
 * Searches for the official, original high-res cover art for a track.
 */
export async function fetchOriginalCoverArt(
  artist: string,
  title: string,
  album?: string
): Promise<CoverSearchResult | null> {
  const cleanTitle = cleanMusicQuery(title);
  const cleanArtist = cleanMusicQuery(artist);
  const cleanAlbum = album ? cleanMusicQuery(album) : '';
  const cacheKey = `${cleanArtist.toLowerCase()}:::${cleanTitle.toLowerCase()}:::${cleanAlbum.toLowerCase()}`;

  if (coverCache.has(cacheKey)) {
    return coverCache.get(cacheKey) || null;
  }

  // Strategy 1: Search by clean artist and album (if album is known and not generic)
  if (cleanAlbum && cleanAlbum !== 'colección personal' && cleanAlbum !== 'desconocido') {
    try {
      const albumTerm = `${cleanArtist} ${cleanAlbum}`.trim();
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(albumTerm)}&entity=album&limit=3`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const item = data.results[0];
          const rawUrl = item.artworkUrl100 || item.artworkUrl60;
          if (rawUrl) {
            const highResUrl = upgradeArtworkResolution(rawUrl, 1000);
            const result: CoverSearchResult = {
              coverUrl: highResUrl,
              thumbnailUrl: rawUrl,
              album: item.collectionName || cleanAlbum,
              artist: item.artistName || cleanArtist,
              year: item.releaseDate ? new Date(item.releaseDate).getFullYear() : undefined,
              genre: item.primaryGenreName,
              releaseDate: item.releaseDate,
            };
            coverCache.set(cacheKey, result);
            return result;
          }
        }
      }
    } catch (e) {
      console.warn('Cover art album strategy fetch error:', e);
    }
  }

  // Strategy 2: Search by artist and song title
  try {
    const songTerm = `${cleanArtist} ${cleanTitle}`.trim();
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(songTerm)}&entity=song&limit=5`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        // Pick the best match (favor non-compilation if possible)
        const match =
          data.results.find(
            (r: any) =>
              r.collectionName &&
              !r.collectionName.toLowerCase().includes('greatest hits') &&
              !r.collectionName.toLowerCase().includes('best of')
          ) || data.results[0];

        const rawUrl = match.artworkUrl100 || match.artworkUrl60;
        if (rawUrl) {
          const highResUrl = upgradeArtworkResolution(rawUrl, 1000);
          const result: CoverSearchResult = {
            coverUrl: highResUrl,
            thumbnailUrl: rawUrl,
            album: match.collectionName || cleanAlbum || 'Álbum Oficial',
            artist: match.artistName || cleanArtist,
            year: match.releaseDate ? new Date(match.releaseDate).getFullYear() : undefined,
            genre: match.primaryGenreName,
            releaseDate: match.releaseDate,
          };
          coverCache.set(cacheKey, result);
          return result;
        }
      }
    }
  } catch (e) {
    console.warn('Cover art song strategy fetch error:', e);
  }

  // Strategy 3: General fallback search with term alone
  try {
    const fallbackTerm = `${cleanArtist} ${cleanTitle}`.trim();
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(fallbackTerm)}&limit=3`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const item = data.results.find((r: any) => r.artworkUrl100 || r.artworkUrl60);
        if (item) {
          const rawUrl = item.artworkUrl100 || item.artworkUrl60;
          const highResUrl = upgradeArtworkResolution(rawUrl, 1000);
          const result: CoverSearchResult = {
            coverUrl: highResUrl,
            thumbnailUrl: rawUrl,
            album: item.collectionName || item.trackName || 'Álbum Oficial',
            artist: item.artistName || cleanArtist,
            year: item.releaseDate ? new Date(item.releaseDate).getFullYear() : undefined,
            genre: item.primaryGenreName,
            releaseDate: item.releaseDate,
          };
          coverCache.set(cacheKey, result);
          return result;
        }
      }
    }
  } catch (e) {
    console.warn('Cover art fallback strategy fetch error:', e);
  }

  return null;
}

/**
 * Searches and returns a list of candidate official album covers
 * so the user can choose the exact edition (e.g. Original LP, Deluxe, Remastered).
 */
export async function searchAllAlbumCovers(query: string): Promise<CoverSearchResult[]> {
  const cleanTerm = cleanMusicQuery(query);
  if (!cleanTerm) return [];

  const results: CoverSearchResult[] = [];
  const seenUrls = new Set<string>();

  try {
    const [albumRes, songRes] = await Promise.all([
      fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(cleanTerm)}&entity=album&limit=6`
      ).catch(() => null),
      fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(cleanTerm)}&entity=song&limit=6`
      ).catch(() => null),
    ]);

    if (albumRes && albumRes.ok) {
      const data = await albumRes.json();
      for (const item of data.results || []) {
        const rawUrl = item.artworkUrl100 || item.artworkUrl60;
        if (rawUrl && !seenUrls.has(rawUrl)) {
          seenUrls.add(rawUrl);
          results.push({
            coverUrl: upgradeArtworkResolution(rawUrl, 1000),
            thumbnailUrl: rawUrl,
            album: item.collectionName || 'Álbum Oficial',
            artist: item.artistName || '',
            year: item.releaseDate ? new Date(item.releaseDate).getFullYear() : undefined,
            genre: item.primaryGenreName,
            releaseDate: item.releaseDate,
          });
        }
      }
    }

    if (songRes && songRes.ok) {
      const data = await songRes.json();
      for (const item of data.results || []) {
        const rawUrl = item.artworkUrl100 || item.artworkUrl60;
        if (rawUrl && !seenUrls.has(rawUrl)) {
          seenUrls.add(rawUrl);
          results.push({
            coverUrl: upgradeArtworkResolution(rawUrl, 1000),
            thumbnailUrl: rawUrl,
            album: item.collectionName || item.trackName || 'Álbum Oficial',
            artist: item.artistName || '',
            year: item.releaseDate ? new Date(item.releaseDate).getFullYear() : undefined,
            genre: item.primaryGenreName,
            releaseDate: item.releaseDate,
          });
        }
      }
    }
  } catch (e) {
    console.error('Error searching all album covers:', e);
  }

  return results;
}
