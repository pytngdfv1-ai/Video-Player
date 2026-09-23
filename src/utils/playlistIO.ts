import { Playlist, Track } from '../types';

export interface MixCaseteExportTrack {
  id: string;
  title: string;
  author: string;
  thumb: string;
  album?: string;
  duration?: number;
  lyrics?: string;
  year?: number | string;
  genre?: string;
}

export interface MixCaseteExportFormat {
  app: string;
  version: number;
  exported: string;
  playlistName?: string;
  description?: string;
  tracks: MixCaseteExportTrack[];
}

/**
 * Exports a playlist to the MixCasete compatible JSON format
 */
export function exportPlaylistToJson(playlist: Playlist, allTracks: Track[]): void {
  const playlistTracks = playlist.trackIds
    .map((id) => allTracks.find((t) => t.id === id))
    .filter((t): t is Track => t !== undefined);

  const exportData: MixCaseteExportFormat = {
    app: 'MixCasete',
    version: 1,
    exported: new Date().toISOString(),
    playlistName: playlist.name,
    description: playlist.description || '',
    tracks: playlistTracks.map((t) => ({
      id: t.youtubeId || t.id,
      title: t.title,
      author: t.artist,
      thumb: t.coverUrl || `https://i.ytimg.com/vi/${t.youtubeId || t.id}/hqdefault.jpg`,
      album: t.album,
      duration: t.duration,
      lyrics: t.lyrics,
      year: t.year,
      genre: t.genre,
    })),
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  // Sanitize filename
  const safeName = (playlist.name || 'MixCasete_Playlist').replace(/[/\\?%*:|"<>]/g, '_');
  link.href = url;
  link.download = `${safeName}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parses and validates an imported JSON file string
 */
export function parseImportedPlaylistJson(jsonString: string): {
  playlistName: string;
  description?: string;
  newTracks: Track[];
} {
  const parsed = JSON.parse(jsonString);

  // Determine track list: either directly parsed if array, or parsed.tracks
  let rawTracks: any[] = [];
  if (Array.isArray(parsed)) {
    rawTracks = parsed;
  } else if (parsed && Array.isArray(parsed.tracks)) {
    rawTracks = parsed.tracks;
  } else {
    throw new Error('El archivo no contiene una lista de canciones válida ("tracks").');
  }

  if (rawTracks.length === 0) {
    throw new Error('La lista de reproducción importada está vacía.');
  }

  const playlistName =
    parsed?.playlistName ||
    (parsed?.app === 'MixCasete' ? 'MixCasete Importada' : 'Lista Importada');
  const description = parsed?.description || 'Importada desde archivo MixCasete compatible';

  const newTracks: Track[] = rawTracks.map((item: any, index: number) => {
    // Extract video ID
    let ytId = '';
    if (typeof item.id === 'string' && item.id.trim()) {
      ytId = item.id.trim();
    } else if (typeof item.youtubeId === 'string' && item.youtubeId.trim()) {
      ytId = item.youtubeId.trim();
    }

    // Clean YouTube ID if full URL
    if (ytId.includes('watch?v=')) {
      const match = ytId.match(/watch\?v=([a-zA-Z0-9_-]{11})/);
      if (match) ytId = match[1];
    } else if (ytId.includes('youtu.be/')) {
      const match = ytId.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
      if (match) ytId = match[1];
    }

    if (!ytId) {
      ytId = `track-${Date.now()}-${index}`;
    }

    const title = item.title || item.name || `Pista ${index + 1}`;
    const artist = item.author || item.artist || item.channel || 'Artista Desconocido';
    const thumb =
      item.thumb ||
      item.coverUrl ||
      item.thumbnail ||
      (ytId.length === 11 ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : '');

    const trackNumber = `Track ${(index + 1).toString().padStart(2, '0')}`;
    const side = index % 2 === 0 ? 'A' : 'B';

    return {
      id: `imported-${ytId}-${Date.now()}-${index}`,
      youtubeId: ytId,
      title,
      artist,
      album: item.album || 'MixCasete Archive',
      year: item.year || new Date().getFullYear(),
      trackNumber,
      side,
      duration: typeof item.duration === 'number' && item.duration > 0 ? item.duration : 240,
      coverUrl: thumb,
      genre: item.genre || 'Rock / Mixtape',
      lyrics:
        item.lyrics ||
        `[Letra de ${title}]\n\n(Pista importada de archivo compatible MixCasete)\nArtista: ${artist}`,
      customNotes: `Importada el ${new Date().toLocaleDateString()}`,
    };
  });

  return {
    playlistName,
    description,
    newTracks,
  };
}
