import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Music, Plus, Youtube, Check, Radio, Disc3, ListPlus, ListMusic, Sparkles, Loader2, GripVertical, Move, RotateCcw } from 'lucide-react';
import { Track, Playlist } from '../types';
import { fetchOriginalCoverArt, CoverSearchResult } from '../utils/coverArtFinder';

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

  // Custom YouTube video input states
  const [customUrl, setCustomUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customArtist, setCustomArtist] = useState('');
  const [selectedTargetPlaylistId, setSelectedTargetPlaylistId] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addError, setAddError] = useState('');

  // Auto-detected cover for custom song form
  const [detectedCover, setDetectedCover] = useState<CoverSearchResult | null>(null);
  const [isSearchingCover, setIsSearchingCover] = useState(false);

  // Debounced effect to fetch original cover art when title or artist changes
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

  // Extract YouTube ID from multiple URL formats
  const extractYouTubeId = (url: string): string | null => {
    const trimmed = url.trim();
    if (!trimmed) return null;
    // Direct 11-character ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }
    // youtube.com/watch?v=...
    const vMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (vMatch) return vMatch[1];
    // youtu.be/...
    const beMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (beMatch) return beMatch[1];
    // youtube.com/embed/...
    const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];

    return null;
  };

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
      duration: 240, // default 4 mins estimate
      coverUrl,
      genre: detectedCover?.genre || 'Personal Selection',
      customNotes: `Tema importado con carátula original de estudio (${albumName}).`,
      lyrics: `[Letra de ${title}]
(Puedes editar esta letra desde la pestaña "Letra" en la pantalla principal para personalizar tu exportación en PDF)

1. Disfruta del video oficial de YouTube.
2. Añade las estrofas que desees.
3. Exporta a PDF con la carátula oficial.`,
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

  // Filtered tracks list
  const filteredTracks = tracks.filter((track) => {
    const matchesSearch =
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
        <span className="text-[11px] sm:text-xs tracking-wider uppercase font-bold">Buscar Temas</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            id="floating-search-modal"
            className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 bg-zinc-950 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-100">Buscador y Repertorio</h3>
                  <p className="text-xs text-zinc-400">
                    Selecciona una pista, añade a tus listas o importa desde YouTube
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

            {/* Search Input Bar */}
            <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/50 space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por título, artista o letra..."
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 rounded-xl border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  autoFocus
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Genre Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'rock', label: 'Rock' },
                  { id: 'synth', label: 'Synthwave' },
                  { id: 'pop', label: 'Pop' },
                  { id: '80s', label: '80s / Retro' },
                ].map((genre) => (
                  <button
                    key={genre.id}
                    onClick={() => setSelectedGenre(genre.id)}
                    className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                      selectedGenre === genre.id
                        ? 'bg-amber-500 text-zinc-950 font-bold'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                    }`}
                  >
                    {genre.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Add YouTube Link Form */}
            <div className="px-4 py-2 bg-zinc-950/70 border-b border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-medium">¿Quieres reproducir otro video?</span>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold"
              >
                {showAddForm ? (
                  <span>Ocultar formulario</span>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Pegar enlace de video</span>
                  </>
                )}
              </button>
            </div>

            {/* Add Custom Video Track Form */}
            {showAddForm && (
              <form
                onSubmit={handleAddYouTubeTrack}
                className="p-4 bg-zinc-950/90 border-b border-zinc-800 space-y-3 animate-in slide-in-from-top duration-200"
              >
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                    URL o ID del video
                  </label>
                  <div className="relative">
                    <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                    <input
                      type="text"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 rounded-lg border border-zinc-700 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
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
                      placeholder="Ej. Mi Canción Favorita"
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
                      placeholder="Ej. Mi Banda"
                      className="w-full px-2.5 py-1.5 bg-zinc-900 rounded-lg border border-zinc-700 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>

                {/* Auto-detected Original Cover Preview */}
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
                        <span>CARÁTULA ORIGINAL ENCONTRADA</span>
                      </div>
                      <p className="font-semibold text-zinc-200 truncate">{detectedCover.album}</p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {detectedCover.artist} {detectedCover.year ? `• ${detectedCover.year}` : ''}
                      </p>
                    </div>
                  </div>
                )}

                {/* Option to assign to playlist right away */}
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

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400"
                  >
                    Añadir y Reproducir
                  </button>
                </div>
              </form>
            )}

            {/* Results Tracks List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {filteredTracks.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-xs">
                  No se encontraron temas coincidentes con &quot;{searchTerm}&quot;.
                </div>
              ) : (
                filteredTracks.map((track) => {
                  const isCurrent = track.id === currentTrackId;
                  const isPickingPlaylist = activePlaylistPickerTrackId === track.id;

                  return (
                    <div
                      key={track.id}
                      className={`relative flex items-center justify-between p-2.5 rounded-xl transition-all border ${
                        isCurrent
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                          : 'bg-zinc-950/60 hover:bg-zinc-800/80 border-zinc-800/60 text-zinc-300'
                      }`}
                    >
                      {/* Track info & play trigger */}
                      <button
                        onClick={() => {
                          onSelectTrack(track);
                          setIsOpen(false);
                        }}
                        className="flex items-center gap-3 min-w-0 pr-2 flex-1 text-left"
                      >
                        {/* Cover Thumbnail */}
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-zinc-700/80 bg-zinc-900">
                          <img
                            src={track.coverUrl}
                            alt={track.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-zinc-100 truncate">
                              {track.title}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 shrink-0">
                              {track.trackNumber}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 truncate">
                            {track.artist} • {track.album}
                          </p>
                        </div>
                      </button>

                      {/* Right actions: Add to playlist button & play status */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Add to Playlist button */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePlaylistPickerTrackId(
                                isPickingPlaylist ? null : track.id
                              );
                            }}
                            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                              isPickingPlaylist
                                ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold'
                                : 'bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                            }`}
                            title="Añadir a lista de reproducción"
                          >
                            <ListPlus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline text-[10px]">+ Lista</span>
                          </button>

                          {/* Quick Playlist Picker Dropdown Popover */}
                          {isPickingPlaylist && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-950 border border-zinc-700 rounded-xl shadow-2xl p-1.5 z-50 text-left animate-in fade-in zoom-in-95">
                              <p className="text-[10px] font-mono text-zinc-400 px-2 py-1 border-b border-zinc-800 font-semibold">
                                Añadir a lista:
                              </p>
                              <div className="max-h-36 overflow-y-auto py-1 space-y-0.5">
                                {playlists.map((pl) => {
                                  const alreadyIn = pl.trackIds.includes(track.id);
                                  return (
                                    <button
                                      key={pl.id}
                                      onClick={() =>
                                        handleAddToPlaylistQuick(pl.id, track.id, track.title)
                                      }
                                      disabled={alreadyIn}
                                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                                        alreadyIn
                                          ? 'opacity-50 text-zinc-500 cursor-not-allowed'
                                          : 'hover:bg-zinc-800 text-zinc-200 hover:text-amber-400'
                                      }`}
                                    >
                                      <span className="truncate">{pl.name}</span>
                                      {alreadyIn && <Check className="w-3 h-3 text-emerald-400" />}
                                    </button>
                                  );
                                })}
                              </div>
                              <button
                                onClick={() => {
                                  setActivePlaylistPickerTrackId(null);
                                  setIsOpen(false);
                                  onOpenPlaylists();
                                }}
                                className="w-full text-left px-2 py-1 text-[10px] text-amber-400 hover:text-amber-300 font-medium border-t border-zinc-800 block mt-1"
                              >
                                + Crear nueva lista...
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Select & Play button */}
                        <button
                          onClick={() => {
                            onSelectTrack(track);
                            setIsOpen(false);
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isCurrent
                              ? 'bg-amber-500 text-zinc-950'
                              : 'bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-300'
                          }`}
                          title="Reproducir ahora"
                        >
                          {isCurrent ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Disc3 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-500 px-4">
              <span>{filteredTracks.length} pista(s) en repertorio</span>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenPlaylists();
                }}
                className="text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>Ver Mixtapes y Listas</span>
                <ListMusic className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

