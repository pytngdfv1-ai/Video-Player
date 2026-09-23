import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Music,
  Plus,
  Youtube,
  Check,
  Radio,
  Disc3,
  ListPlus,
  ListMusic,
  Sparkles,
  Loader2,
  GripVertical,
  RotateCcw,
  ExternalLink,
  Play,
  Globe,
  Library,
} from 'lucide-react';
import { Track, Playlist } from '../types';
import { fetchOriginalCoverArt, CoverSearchResult } from '../utils/coverArtFinder';
import {
  searchOnlineTracks,
  fetchYouTubeInfo,
  isYouTubeInput,
  extractYouTubeId,
  resolveYouTubeVideoId,
  OnlineSearchResult,
  YouTubeVideoInfo,
} from '../utils/musicSearch';

interface FloatingSearchProps {
  tracks: Track[];
  currentTrackId: string;
  playlists: Playlist[];
  onSelectTrack: (track: Track) => void;
  onAddCustomTrack: (newTrack: Track, targetPlaylistId?: string) => void;
  onAddTrackToPlaylist: (playlistId: string, trackId: string) => void;
  onOpenPlaylists: () => void;
}

export const FloatingSearch: React.FC<FloatingSearchProps> = ({
  tracks,
  currentTrackId,
  playlists,
  onSelectTrack,
  onAddCustomTrack,
  onAddTrackToPlaylist,
  onOpenPlaylists,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'local' | 'custom'>('all');

  // Online search states
  const [onlineResults, setOnlineResults] = useState<OnlineSearchResult[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);

  // Detected YouTube video when pasting URL/ID into search bar
  const [detectedYtVideo, setDetectedYtVideo] = useState<YouTubeVideoInfo | null>(null);
  const [isLoadingYtDetect, setIsLoadingYtDetect] = useState(false);

  // Custom YouTube video manual form states
  const [customUrl, setCustomUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customArtist, setCustomArtist] = useState('');
  const [selectedTargetPlaylistId, setSelectedTargetPlaylistId] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addError, setAddError] = useState('');

  // Auto-detected cover for custom song form
  const [detectedCover, setDetectedCover] = useState<CoverSearchResult | null>(null);
  const [isSearchingCover, setIsSearchingCover] = useState(false);

  // Track playlist popover selector
  const [activePlaylistPickerTrackId, setActivePlaylistPickerTrackId] = useState<string | null>(null);
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Draggable Floating Search Button State
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    const saved = localStorage.getItem('yt_cassette_floating_pos');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      } catch (e) {
        // ignore
      }
    }
    return null;
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initPosX: number;
    initPosY: number;
    hasMoved: boolean;
  }>({
    startX: 0,
    startY: 0,
    initPosX: 0,
    initPosY: 0,
    hasMoved: false,
  });

  // Debounced online search & YouTube link detection when searchTerm changes
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setOnlineResults([]);
      setDetectedYtVideo(null);
      setIsSearchingOnline(false);
      return;
    }

    // Check if input is a YouTube URL or direct 11-char ID
    if (isYouTubeInput(trimmed)) {
      setIsLoadingYtDetect(true);
      const timer = setTimeout(async () => {
        try {
          const info = await fetchYouTubeInfo(trimmed);
          setDetectedYtVideo(info);
        } catch (e) {
          console.warn('Error detecting YouTube info:', e);
        } finally {
          setIsLoadingYtDetect(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setDetectedYtVideo(null);
    }

    // Otherwise, perform online music search if at least 2 characters
    if (trimmed.length >= 2) {
      setIsSearchingOnline(true);
      const timer = setTimeout(async () => {
        try {
          const results = await searchOnlineTracks(trimmed, 15);
          setOnlineResults(results);
        } catch (e) {
          console.warn('Error during online search:', e);
        } finally {
          setIsSearchingOnline(false);
        }
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setOnlineResults([]);
      setIsSearchingOnline(false);
    }
  }, [searchTerm]);

  // Debounced effect for manual add form cover preview
  useEffect(() => {
    if (!showAddForm || (!customTitle.trim() && !customArtist.trim())) {
      setDetectedCover(null);
      return;
    }
    const timer = setTimeout(async () => {
      if (customTitle.trim().length >= 2 || customArtist.trim().length >= 2) {
        setIsSearchingCover(true);
        try {
          const res = await fetchOriginalCoverArt(customArtist.trim(), customTitle.trim());
          setDetectedCover(res);
        } catch (e) {
          console.warn('Auto cover search error:', e);
        } finally {
          setIsSearchingCover(false);
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [customTitle, customArtist, showAddForm]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const btnRect = e.currentTarget.getBoundingClientRect();
    const currentX = position ? position.x : btnRect.left;
    const currentY = position ? position.y : btnRect.top;

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initPosX: currentX,
      initPosY: currentY,
      hasMoved: false,
    };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragStartRef.current.hasMoved = true;
    }

    const newX = Math.max(8, Math.min(window.innerWidth - 180, dragStartRef.current.initPosX + dx));
    const newY = Math.max(8, Math.min(window.innerHeight - 48, dragStartRef.current.initPosY + dy));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (dragStartRef.current.hasMoved) {
      if (position) {
        localStorage.setItem('yt_cassette_floating_pos', JSON.stringify(position));
      }
    } else {
      setIsOpen(true);
    }
  };

  const handleResetPosition = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPosition(null);
    localStorage.removeItem('yt_cassette_floating_pos');
  };

  const [resolvingTrackId, setResolvingTrackId] = useState<string | null>(null);

  // Convert an online track into an active playable cassette track with REAL YouTube Video ID
  const handleSelectOnlineTrack = async (item: OnlineSearchResult) => {
    setResolvingTrackId(item.id);
    setAddedToast(`🔍 Localizando video oficial para "${item.title}"...`);

    try {
      const realVideoId = await resolveYouTubeVideoId(`${item.artist} ${item.title}`);
      const nextNumber = `Track 0${tracks.length + 1}`;
      const newTrack: Track = {
        id: `online-${Date.now()}`,
        youtubeId: realVideoId,
        title: item.title,
        artist: item.artist,
        album: item.album,
        year: item.year || new Date().getFullYear(),
        trackNumber: nextNumber,
        side: tracks.length % 2 === 0 ? 'A' : 'B',
        duration: item.duration || 240,
        coverUrl: item.coverUrl,
        genre: item.genre || 'Música',
        customNotes: `Tema importado con carátula original de ${item.album}.`,
        lyrics: `[Letra de ${item.title} - ${item.artist}]\n(Puedes editar esta letra desde la pestaña "Letra" en la pantalla principal para sincronizarla o exportarla en PDF)\n\n1. ${item.title}\n2. ${item.artist} - ${item.album}`,
      };

      onAddCustomTrack(newTrack);
      onSelectTrack(newTrack);
      setAddedToast(`▶ Reproduciendo: "${item.title}"`);
      setTimeout(() => setAddedToast(null), 2500);
      setIsOpen(false);
    } catch (e) {
      console.warn('Error resolving YouTube ID:', e);
      setAddedToast('Error al localizar video. Intenta de nuevo.');
      setTimeout(() => setAddedToast(null), 2500);
    } finally {
      setResolvingTrackId(null);
    }
  };

  // Play detected YouTube video from search bar
  const handlePlayDetectedYouTube = (ytInfo: YouTubeVideoInfo) => {
    const nextNumber = `Track 0${tracks.length + 1}`;
    const newTrack: Track = {
      id: `yt-${Date.now()}`,
      youtubeId: ytInfo.videoId,
      title: ytInfo.title,
      artist: ytInfo.author,
      album: 'YouTube Video',
      year: new Date().getFullYear(),
      trackNumber: nextNumber,
      side: tracks.length % 2 === 0 ? 'A' : 'B',
      duration: 240,
      coverUrl: ytInfo.thumbnailUrl,
      genre: 'YouTube',
      customNotes: `Video de YouTube: ${ytInfo.originalUrl}`,
      lyrics: `[Letra de ${ytInfo.title}]\n(Puedes editar esta letra desde la pestaña "Letra" en la pantalla principal para personalizar tu exportación en PDF)\n\n1. Disfruta del video oficial de YouTube.\n2. Añade las estrofas que desees.\n3. Exporta a PDF con la carátula.`,
    };

    onAddCustomTrack(newTrack);
    onSelectTrack(newTrack);
    setAddedToast(`▶ Reproduciendo: "${ytInfo.title}"`);
    setTimeout(() => setAddedToast(null), 2500);
    setIsOpen(false);
  };

  // Play search term directly on YouTube with real verified video ID
  const handlePlayDirectSearchTerm = async (query: string) => {
    const clean = query.trim();
    if (!clean) return;

    setAddedToast(`🔍 Localizando video oficial en YouTube para "${clean}"...`);
    try {
      const realVideoId = await resolveYouTubeVideoId(clean);
      const nextNumber = `Track 0${tracks.length + 1}`;
      const newTrack: Track = {
        id: `search-${Date.now()}`,
        youtubeId: realVideoId,
        title: clean,
        artist: 'YouTube Music',
        album: 'Búsqueda en YouTube',
        year: new Date().getFullYear(),
        trackNumber: nextNumber,
        side: tracks.length % 2 === 0 ? 'A' : 'B',
        duration: 240,
        coverUrl: `https://img.youtube.com/vi/${realVideoId}/hqdefault.jpg`,
        genre: 'En Vivo',
        customNotes: `Búsqueda en YouTube: ${clean}`,
        lyrics: `[Búsqueda de YouTube: ${clean}]\n(Puedes editar esta letra desde la pestaña "Letra" en la pantalla principal para personalizar tu exportación en PDF)`,
      };

      onAddCustomTrack(newTrack);
      onSelectTrack(newTrack);
      setAddedToast(`▶ Reproduciendo: "${clean}"`);
      setTimeout(() => setAddedToast(null), 2500);
      setIsOpen(false);
    } catch (e) {
      console.warn('Error resolving direct search:', e);
    }
  };

  // Submit manual YouTube track
  const handleAddYouTubeTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    const ytId = extractYouTubeId(customUrl);
    if (!ytId) {
      setAddError('Por favor ingresa una URL válida de YouTube o un ID de video de 11 caracteres.');
      return;
    }

    const title = customTitle.trim() || 'Video de YouTube';
    const artist = customArtist.trim() || 'Artista';
    const nextNumber = `Track 0${tracks.length + 1}`;

    let coverUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    let albumName = 'Colección Personal';
    let trackYear = new Date().getFullYear();

    if (detectedCover) {
      coverUrl = detectedCover.coverUrl;
      albumName = detectedCover.album || albumName;
      if (detectedCover.year) trackYear = detectedCover.year;
    } else if (title && artist) {
      try {
        const found = await fetchOriginalCoverArt(artist, title);
        if (found) {
          coverUrl = found.coverUrl;
          if (found.album) albumName = found.album;
          if (found.year) trackYear = found.year;
        }
      } catch (err) {
        console.warn('Final cover fetch error:', err);
      }
    }

    const newTrack: Track = {
      id: `custom-${Date.now()}`,
      youtubeId: ytId,
      title,
      artist,
      album: albumName,
      year: trackYear,
      trackNumber: nextNumber,
      side: tracks.length % 2 === 0 ? 'A' : 'B',
      duration: 240,
      coverUrl,
      genre: detectedCover?.genre || 'Personal Selection',
      customNotes: `Tema importado con carátula original de estudio (${albumName}).`,
      lyrics: `[Letra de ${title}]\n(Puedes editar esta letra desde la pestaña "Letra" en la pantalla principal para personalizar tu exportación en PDF)\n\n1. Disfruta del video oficial de YouTube.\n2. Añade las estrofas que desees.\n3. Exporta a PDF con la carátula oficial.`,
    };

    onAddCustomTrack(newTrack, selectedTargetPlaylistId || undefined);
    onSelectTrack(newTrack);
    setCustomUrl('');
    setCustomTitle('');
    setCustomArtist('');
    setDetectedCover(null);
    setSelectedTargetPlaylistId('');
    setShowAddForm(false);
    setIsOpen(false);
  };

  const handleAddToPlaylistQuick = (playlistId: string, trackId: string, trackTitle: string) => {
    onAddTrackToPlaylist(playlistId, trackId);
    const plName = playlists.find((p) => p.id === playlistId)?.name || 'lista';
    setAddedToast(`"${trackTitle}" añadido a ${plName}`);
    setActivePlaylistPickerTrackId(null);
    setTimeout(() => setAddedToast(null), 2500);
  };

  // Filtered local tracks list
  const filteredLocalTracks = tracks.filter((track) => {
    const matchesSearch =
      !searchTerm.trim() ||
      track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      track.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
      track.album.toLowerCase().includes(searchTerm.toLowerCase()) ||
      track.lyrics.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesGenre =
      selectedGenre === 'all' || track.genre.toLowerCase().includes(selectedGenre.toLowerCase());

    return matchesSearch && matchesGenre;
  });

  return (
    <>
      {/* Toast Notification */}
      {addedToast && (
        <div className="fixed top-12 sm:top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-600 text-white font-medium text-xs rounded-xl shadow-xl animate-in fade-in slide-in-from-top-2">
          {addedToast}
        </div>
      )}

      {/* Draggable Floating Action Button (FAB) */}
      <button
        id="floating-search-btn"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={
          position
            ? {
                top: `${position.y}px`,
                left: `${position.x}px`,
                transform: 'none',
                touchAction: 'none',
              }
            : {
                top: '0.375rem',
                left: '50%',
                transform: 'translateX(-50%)',
                touchAction: 'none',
              }
        }
        className={`fixed z-40 flex items-center gap-1.5 px-3 py-1 sm:py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold rounded-full shadow-xl shadow-amber-500/25 ring-1 ring-white/20 select-none group font-mono text-xs ${
          isDragging ? 'cursor-grabbing scale-105 shadow-2xl' : 'cursor-grab hover:scale-102 active:scale-95'
        }`}
        title="Arrastra para mover a cualquier parte de la pantalla o haz clic para buscar temas"
      >
        <GripVertical className="w-3 h-3 opacity-60 group-hover:opacity-100 shrink-0" />
        <Search className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform shrink-0" />
        <span className="text-[11px] sm:text-xs tracking-wider uppercase font-bold">Buscar Canciones</span>
        <span className="flex h-1.5 w-1.5 relative shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-950 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-zinc-950"></span>
        </span>
        {position && (
          <span
            onClick={handleResetPosition}
            className="ml-1 p-0.5 rounded-full hover:bg-black/20 text-zinc-900 transition-colors"
            title="Restablecer posición inicial arriba al centro"
          >
            <RotateCcw className="w-3 h-3" />
          </span>
        )}
      </button>

      {/* Floating Search Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            id="floating-search-modal"
            className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 bg-zinc-950 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-zinc-100 flex items-center gap-2">
                    <span>Buscador Universal de Música</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono">
                      YouTube & Red
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Busca cualquier canción, artista o pega un enlace de YouTube
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenPlaylists();
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-bold text-xs transition-colors"
                  title="Abrir gestor de listas"
                >
                  <ListMusic className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Listas</span>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Universal Search Bar */}
            <div className="p-3.5 sm:p-4 border-b border-zinc-800/80 bg-zinc-900/70 space-y-2.5">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchTerm.trim()) {
                      e.preventDefault();
                      handlePlayDirectSearchTerm(searchTerm);
                    }
                  }}
                  placeholder="Escribe el nombre de la canción, artista o pega enlace de YouTube..."
                  className="w-full pl-10 pr-10 py-3 bg-zinc-950 rounded-xl border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  autoFocus
                />
                {searchTerm ? (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-500 hidden sm:inline">
                    ENTER para buscar
                  </span>
                )}
              </div>

              {/* View Selector Tabs */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-colors ${
                      activeTab === 'all'
                        ? 'bg-amber-500 text-zinc-950 font-bold'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Todo y en la Red ({onlineResults.length + filteredLocalTracks.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('local')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-colors ${
                      activeTab === 'local'
                        ? 'bg-amber-500 text-zinc-950 font-bold'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Library className="w-3.5 h-3.5" />
                    <span>Mi Colección ({filteredLocalTracks.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('custom')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-colors ${
                      activeTab === 'custom'
                        ? 'bg-amber-500 text-zinc-950 font-bold'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Pegar URL</span>
                  </button>
                </div>

                {isSearchingOnline && (
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="hidden sm:inline">Buscando en red...</span>
                  </div>
                )}
              </div>
            </div>

            {/* DETECTED YOUTUBE VIDEO CARD (When user pastes a link) */}
            {isLoadingYtDetect && (
              <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-center gap-2 text-xs text-amber-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analizando enlace de YouTube...</span>
              </div>
            )}

            {detectedYtVideo && (
              <div className="p-4 bg-gradient-to-r from-red-950/40 via-zinc-950 to-zinc-900 border-b border-red-500/40 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start gap-3">
                  <div className="relative w-24 h-16 sm:w-28 sm:h-18 rounded-lg overflow-hidden shrink-0 border border-red-500/50 shadow-lg">
                    <img
                      src={detectedYtVideo.thumbnailUrl}
                      alt={detectedYtVideo.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Youtube className="w-6 h-6 text-red-500 drop-shadow-md" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-red-400 font-bold uppercase tracking-wider mb-0.5">
                      <Sparkles className="w-3 h-3" />
                      <span>Video de YouTube Detectado</span>
                    </div>
                    <h4 className="text-sm font-bold text-zinc-100 truncate">{detectedYtVideo.title}</h4>
                    <p className="text-xs text-zinc-400 truncate mb-2">{detectedYtVideo.author}</p>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePlayDetectedYouTube(detectedYtVideo)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md transition-transform active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5 fill-zinc-950" />
                        <span>Reproducir Ahora</span>
                      </button>
                      <button
                        onClick={() => {
                          setCustomUrl(detectedYtVideo.originalUrl);
                          setCustomTitle(detectedYtVideo.title);
                          setCustomArtist(detectedYtVideo.author);
                          setShowAddForm(true);
                          setActiveTab('custom');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
                      >
                        Personalizar Carátula
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* TAB 1: ALL & ONLINE RESULTS */}
              {(activeTab === 'all' || activeTab === 'local') && (
                <>
                  {/* DIRECT YOUTUBE SEARCH ACTION BANNER */}
                  {searchTerm.trim().length > 1 && !detectedYtVideo && (
                    <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-red-600/20 text-red-400 shrink-0">
                          <Youtube className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-200">
                            ¿Reproducir directamente en YouTube?
                          </p>
                          <p className="text-[11px] text-zinc-400">
                            Buscar &quot;{searchTerm}&quot; y cargar video oficial en el cassette
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handlePlayDirectSearchTerm(searchTerm)}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow transition-transform active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5 fill-zinc-950" />
                        <span>Buscar y Reproducir</span>
                      </button>
                    </div>
                  )}

                  {/* SECTION 1: Local Tracks in Collection */}
                  {filteredLocalTracks.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Library className="w-3.5 h-3.5 text-amber-400" />
                          <span>En Mi Colección ({filteredLocalTracks.length})</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        {filteredLocalTracks.map((track) => {
                          const isCurrent = track.id === currentTrackId;
                          const isPickingPlaylist = activePlaylistPickerTrackId === track.id;

                          return (
                            <div
                              key={track.id}
                              className={`group relative flex items-center justify-between p-2 rounded-xl border transition-all ${
                                isCurrent
                                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                                  : 'bg-zinc-950/60 hover:bg-zinc-800/50 border-zinc-800/80 text-zinc-300'
                              }`}
                            >
                              <div
                                onClick={() => {
                                  onSelectTrack(track);
                                  setIsOpen(false);
                                }}
                                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer pr-2"
                              >
                                <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-zinc-700/50 shadow-sm">
                                  <img
                                    src={track.coverUrl}
                                    alt={track.title}
                                    className="w-full h-full object-cover"
                                  />
                                  {isCurrent && (
                                    <div className="absolute inset-0 bg-amber-500/30 flex items-center justify-center">
                                      <Disc3 className="w-4 h-4 text-amber-300 animate-spin" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-xs text-zinc-200 truncate group-hover:text-amber-300 transition-colors">
                                    {track.title}
                                  </p>
                                  <p className="text-[11px] text-zinc-400 truncate">
                                    {track.artist} • {track.album}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {playlists.length > 0 && (
                                  <button
                                    onClick={() =>
                                      setActivePlaylistPickerTrackId(isPickingPlaylist ? null : track.id)
                                    }
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition-colors"
                                    title="Añadir a lista"
                                  >
                                    <ListPlus className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    onSelectTrack(track);
                                    setIsOpen(false);
                                  }}
                                  className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition-all active:scale-90"
                                  title="Reproducir"
                                >
                                  <Play className="w-3.5 h-3.5 fill-zinc-950" />
                                </button>
                              </div>

                              {/* Playlist Picker Popover */}
                              {isPickingPlaylist && (
                                <div className="absolute right-0 top-full mt-1 w-52 bg-zinc-950 border border-zinc-700 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 text-left">
                                  <p className="text-[10px] font-mono text-zinc-400 px-2 py-1 border-b border-zinc-800 font-semibold">
                                    Añadir a lista:
                                  </p>
                                  <div className="max-h-40 overflow-y-auto py-1 space-y-0.5">
                                    {playlists.map((pl) => {
                                      const inList = pl.trackIds.includes(track.id);
                                      return (
                                        <button
                                          key={pl.id}
                                          onClick={() =>
                                            handleAddToPlaylistQuick(pl.id, track.id, track.title)
                                          }
                                          disabled={inList}
                                          className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                                            inList
                                              ? 'opacity-50 text-zinc-500 cursor-not-allowed'
                                              : 'hover:bg-zinc-800 text-zinc-200 hover:text-amber-400'
                                          }`}
                                        >
                                          <span className="truncate">{pl.name}</span>
                                          {inList && <Check className="w-3 h-3 text-emerald-400" />}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SECTION 2: Online Songs & Studio Albums Found */}
                  {activeTab === 'all' && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-amber-400" />
                          <span>Canciones en la Red Oficial ({onlineResults.length})</span>
                        </span>
                        {isSearchingOnline && (
                          <span className="text-[10px] font-mono text-zinc-500 animate-pulse">
                            Consultando catálogo...
                          </span>
                        )}
                      </div>

                      {onlineResults.length === 0 && !isSearchingOnline && searchTerm.trim().length > 1 && (
                        <div className="py-6 text-center text-zinc-500 text-xs bg-zinc-950/40 rounded-xl border border-zinc-800/60 p-4">
                          <p className="mb-2">No se encontraron álbumes exactos para &quot;{searchTerm}&quot;.</p>
                          <button
                            onClick={() => handlePlayDirectSearchTerm(searchTerm)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400"
                          >
                            ▶ Buscar &quot;{searchTerm}&quot; en YouTube directamente
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {onlineResults.map((item) => (
                          <div
                            key={item.id}
                            className="group flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/70 hover:bg-zinc-800/60 border border-zinc-800/80 hover:border-amber-500/40 transition-all text-left"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                              <img
                                src={item.coverUrl}
                                alt={item.title}
                                className="w-11 h-11 rounded-lg object-cover border border-zinc-700/60 shadow shrink-0 group-hover:scale-105 transition-transform"
                                loading="lazy"
                              />
                              <div className="min-w-0 flex-1">
                                <h5 className="font-bold text-xs text-zinc-200 truncate group-hover:text-amber-400 transition-colors">
                                  {item.title}
                                </h5>
                                <p className="text-[11px] text-zinc-400 truncate">{item.artist}</p>
                                <p className="text-[10px] text-zinc-500 truncate font-mono">
                                  {item.album} {item.year ? `• ${item.year}` : ''}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => handleSelectOnlineTrack(item)}
                              disabled={resolvingTrackId === item.id}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1 shrink-0 shadow-md transition-transform active:scale-95 disabled:opacity-60"
                              title="Cargar en cassette y reproducir"
                            >
                              {resolvingTrackId === item.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Play className="w-3.5 h-3.5 fill-zinc-950" />
                              )}
                              <span className="hidden sm:inline">
                                {resolvingTrackId === item.id ? 'Cargando...' : 'Cargar'}
                              </span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state when no search term */}
                  {!searchTerm.trim() && filteredLocalTracks.length === 0 && (
                    <div className="py-12 text-center text-zinc-500 text-xs space-y-2">
                      <Music className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                      <p className="font-semibold text-zinc-400">Escribe cualquier canción o artista para buscar</p>
                      <p className="text-zinc-500 text-[11px]">
                        Ejemplo: Coldplay, Queen, Bad Bunny, Michael Jackson, Daft Punk...
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* TAB 3: CUSTOM YOUTUBE URL FORM */}
              {activeTab === 'custom' && (
                <form
                  onSubmit={handleAddYouTubeTrack}
                  className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3"
                >
                  <h4 className="font-bold text-sm text-zinc-200 flex items-center gap-2">
                    <Youtube className="w-4 h-4 text-red-500" />
                    <span>Importar Enlace de Video de YouTube</span>
                  </h4>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                      URL o ID de YouTube
                    </label>
                    <div className="relative">
                      <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                      <input
                        type="text"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full pl-9 pr-3 py-2 bg-zinc-900 rounded-lg border border-zinc-700 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                        Título de la canción
                      </label>
                      <input
                        type="text"
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        placeholder="Ej. Bohemian Rhapsody"
                        className="w-full px-2.5 py-1.5 bg-zinc-900 rounded-lg border border-zinc-700 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                        Artista / Banda
                      </label>
                      <input
                        type="text"
                        value={customArtist}
                        onChange={(e) => setCustomArtist(e.target.value)}
                        placeholder="Ej. Queen"
                        className="w-full px-2.5 py-1.5 bg-zinc-900 rounded-lg border border-zinc-700 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                  </div>

                  {isSearchingCover && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      <span>Buscando carátula oficial en Apple Music / iTunes...</span>
                    </div>
                  )}

                  {detectedCover && (
                    <div className="flex items-center gap-2.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs">
                      <img
                        src={detectedCover.coverUrl}
                        alt={detectedCover.album}
                        className="w-12 h-12 rounded object-cover border border-amber-500/50 shadow-md shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400">
                          <Sparkles className="w-3 h-3" />
                          <span>CARÁTULA ORIGINAL DETECTADA</span>
                        </div>
                        <p className="font-semibold text-zinc-200 truncate">{detectedCover.album}</p>
                        <p className="text-[11px] text-zinc-400 truncate">
                          {detectedCover.artist} {detectedCover.year ? `• ${detectedCover.year}` : ''}
                        </p>
                      </div>
                    </div>
                  )}

                  {playlists.length > 0 && (
                    <div>
                      <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                        Añadir a lista de reproducción (opcional)
                      </label>
                      <select
                        value={selectedTargetPlaylistId}
                        onChange={(e) => setSelectedTargetPlaylistId(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-zinc-900 rounded-lg border border-zinc-700 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="">-- Ninguna (Solo repertorio general) --</option>
                        {playlists.map((pl) => (
                          <option key={pl.id} value={pl.id}>
                            {pl.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {addError && <p className="text-[11px] text-red-400">{addError}</p>}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400 shadow-md"
                    >
                      Añadir y Reproducir Ahora
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
