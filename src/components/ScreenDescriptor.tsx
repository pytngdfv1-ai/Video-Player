import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  ExternalLink,
  Download,
  FileText,
  Music,
  Image as ImageIcon,
  Video,
  Check,
  Copy,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  ListMusic,
  ListPlus,
  Search,
  Disc,
  Disc3,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FastForward,
} from 'lucide-react';
import { Track, ViewTab, Playlist } from '../types';
import { generateTrackPDF } from '../utils/pdfGenerator';
import { fetchOriginalCoverArt, searchAllAlbumCovers, CoverSearchResult } from '../utils/coverArtFinder';
import { resolveYouTubeVideoId } from '../utils/musicSearch';
import { SmoothCoverImage } from './SmoothCoverImage';
import { PDFPreview } from './PDFPreview';
import { useSwipeGesture } from '../hooks/useSwipeGesture';

const TABS: ViewTab[] = ['video', 'cover', 'lyrics', 'pdf'];

interface ScreenDescriptorProps {
  track: Track;
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  duration: number;
  onSeek?: (time: number) => void;
  onUpdateTrackLyrics?: (lyrics: string) => void;
  onUpdateTrackCover?: (trackId: string, newCoverUrl: string, album?: string, year?: number) => void;
  playlists?: Playlist[];
  activePlaylistName?: string | null;
  onOpenPlaylists?: () => void;
  onAddCurrentTrackToPlaylist?: (playlistId: string) => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const ScreenDescriptor: React.FC<ScreenDescriptorProps> = ({
  track,
  activeTab,
  onTabChange,
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  onSeek,
  onUpdateTrackLyrics,
  onUpdateTrackCover,
  playlists = [],
  activePlaylistName,
  onOpenPlaylists,
  onAddCurrentTrackToPlaylist,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [copiedLyrics, setCopiedLyrics] = useState(false);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [autoScroll, setAutoScroll] = useState(true);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const [isEditingLyrics, setIsEditingLyrics] = useState(false);
  const [editableLyrics, setEditableLyrics] = useState(track.lyrics);
  const [showPlaylistDropdown, setShowPlaylistDropdown] = useState(false);
  const [playlistAddedToast, setPlaylistAddedToast] = useState<string | null>(null);
  const [hudFeedback, setHudFeedback] = useState<'play' | 'pause' | null>(null);
  const hudTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const screenContainerRef = useRef<HTMLDivElement>(null);
  const [tabSwipeHint, setTabSwipeHint] = useState<string | null>(null);

  // Guarantee valid 11-char YouTube Video ID to avoid "Video no disponible" errors
  const [resolvedVideoId, setResolvedVideoId] = useState<string>(() => {
    return track.youtubeId?.startsWith('search:') ? '' : track.youtubeId;
  });
  const [isResolvingVideo, setIsResolvingVideo] = useState(false);

  useEffect(() => {
    if (track.youtubeId?.startsWith('search:') || !track.youtubeId) {
      setIsResolvingVideo(true);
      const query = track.youtubeId ? track.youtubeId.replace('search:', '') : `${track.artist} ${track.title}`;
      resolveYouTubeVideoId(query)
        .then((realId) => {
          track.youtubeId = realId;
          setResolvedVideoId(realId);
        })
        .catch(() => {
          setResolvedVideoId('fJ9rUzIMcZQ');
        })
        .finally(() => {
          setIsResolvingVideo(false);
        });
    } else {
      setResolvedVideoId(track.youtubeId);
      setIsResolvingVideo(false);
    }
  }, [track.id, track.youtubeId, track.artist, track.title]);

  // Swipe gesture navigation across tabs
  const handleSwipeNextTab = () => {
    const currentIdx = TABS.indexOf(activeTab);
    if (currentIdx < TABS.length - 1) {
      const nextTab = TABS[currentIdx + 1];
      onTabChange(nextTab);
      setTabSwipeHint(`Pestaña: ${nextTab.toUpperCase()}`);
      setTimeout(() => setTabSwipeHint(null), 1200);
    }
  };

  const handleSwipePrevTab = () => {
    const currentIdx = TABS.indexOf(activeTab);
    if (currentIdx > 0) {
      const prevTab = TABS[currentIdx - 1];
      onTabChange(prevTab);
      setTabSwipeHint(`Pestaña: ${prevTab.toUpperCase()}`);
      setTimeout(() => setTabSwipeHint(null), 1200);
    }
  };

  useSwipeGesture({
    targetRef: screenContainerRef,
    onSwipeLeft: handleSwipeNextTab,
    onSwipeRight: handleSwipePrevTab,
    threshold: 45,
  });

  // Synchronized Lyrics Parser & Auto-Scroll Logic
  interface SynchronizedLine {
    id: number;
    timeSeconds: number;
    formattedTime: string;
    text: string;
    isStanzaHeader: boolean;
  }

  const parsedLyrics = useMemo<SynchronizedLine[]>(() => {
    const raw = editableLyrics || track.lyrics || '';
    const lines = raw.split('\n');
    const result: SynchronizedLine[] = [];

    // Check if any line has explicit timestamp tags [mm:ss] or [mm:ss.xx]
    let hasExplicit = false;
    for (const l of lines) {
      if (/\[\d{1,2}:\d{2}(\.\d{1,2})?\]/.test(l)) {
        hasExplicit = true;
        break;
      }
    }

    if (hasExplicit) {
      let currentSec = 0;
      lines.forEach((l, idx) => {
        const match = l.match(/\[(\d{1,2}):(\d{2})(\.\d{1,2})?\]/);
        if (match) {
          const m = parseInt(match[1], 10);
          const s = parseInt(match[2], 10);
          const ms = match[3] ? parseFloat(match[3]) : 0;
          currentSec = m * 60 + s + ms;
        }
        const text = l.replace(/\[\d{1,2}:\d{2}(\.\d{1,2})?\]/g, '').trim();
        if (text) {
          result.push({
            id: idx,
            timeSeconds: currentSec,
            formattedTime: formatTime(currentSec),
            text,
            isStanzaHeader: text.startsWith('[') || text.startsWith('(') || text.endsWith(':'),
          });
        }
      });
    } else {
      // Distribute non-empty lines evenly across song playback duration
      const valid = lines.map((l) => l.trim()).filter((l) => l.length > 0);
      const totalDur = duration > 0 ? duration : (track.duration || 240);
      const intro = Math.min(8, totalDur * 0.04);
      const span = Math.max(10, totalDur - intro - 10);
      const step = valid.length > 0 ? span / valid.length : 4;

      valid.forEach((text, idx) => {
        const timeSeconds = Math.floor(intro + idx * step);
        result.push({
          id: idx,
          timeSeconds,
          formattedTime: formatTime(timeSeconds),
          text,
          isStanzaHeader: text.startsWith('[') || text.startsWith('(') || text.endsWith(':'),
        });
      });
    }
    return result;
  }, [editableLyrics, track.lyrics, duration, track.duration]);

  const activeLineIndex = useMemo(() => {
    if (parsedLyrics.length === 0) return -1;
    let activeIdx = -1;
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (currentTime >= parsedLyrics[i].timeSeconds) {
        activeIdx = i;
      } else {
        break;
      }
    }
    return activeIdx;
  }, [currentTime, parsedLyrics]);

  // Real-time auto-scroll to current synchronized lyric line during playback
  useEffect(() => {
    if (!autoScroll || !isPlaying || activeLineIndex < 0) return;
    const lineEl = document.getElementById(`sync-lyric-line-${activeLineIndex}`);
    if (lineEl && lyricsContainerRef.current) {
      lineEl.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLineIndex, autoScroll, isPlaying]);

  // Original Cover Art Finder States
  const [isSearchingCover, setIsSearchingCover] = useState(false);
  const [coverSearchResults, setCoverSearchResults] = useState<CoverSearchResult[]>([]);
  const [showCoverFinderModal, setShowCoverFinderModal] = useState(false);
  const [coverSearchQuery, setCoverSearchQuery] = useState('');
  const [customCoverUrlInput, setCustomCoverUrlInput] = useState('');
  const [coverToast, setCoverToast] = useState<string | null>(null);

  // Auto-upgrade track cover if missing or if it still has an unsplash/generic placeholder
  useEffect(() => {
    if (
      track.coverUrl &&
      (track.coverUrl.includes('images.unsplash.com') ||
        track.coverUrl.includes('img.youtube.com') ||
        !track.coverUrl)
    ) {
      fetchOriginalCoverArt(track.artist, track.title, track.album).then((found) => {
        if (found && found.coverUrl && found.coverUrl !== track.coverUrl) {
          if (onUpdateTrackCover) {
            onUpdateTrackCover(track.id, found.coverUrl, found.album, found.year);
          }
        }
      });
    }
  }, [track.id, track.coverUrl, track.artist, track.title, track.album, onUpdateTrackCover]);

  const handleOpenCoverFinder = () => {
    const q = `${track.artist} ${track.title}`;
    setCoverSearchQuery(q);
    setShowCoverFinderModal(true);
    handleExecuteCoverSearch(q);
  };

  const handleExecuteCoverSearch = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsSearchingCover(true);
    try {
      const results = await searchAllAlbumCovers(queryText);
      setCoverSearchResults(results);
    } catch (e) {
      console.warn('Cover search error:', e);
    } finally {
      setIsSearchingCover(false);
    }
  };

  const handleApplyCover = (result: CoverSearchResult) => {
    if (onUpdateTrackCover) {
      onUpdateTrackCover(track.id, result.coverUrl, result.album, result.year);
    }
    setCoverToast(`¡Carátula de "${result.album}" aplicada!`);
    setShowCoverFinderModal(false);
    setTimeout(() => setCoverToast(null), 3000);
  };

  const handleApplyManualCoverUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCoverUrlInput.trim()) return;
    if (onUpdateTrackCover) {
      onUpdateTrackCover(track.id, customCoverUrlInput.trim());
    }
    setCoverToast('¡Carátula personalizada aplicada!');
    setCustomCoverUrlInput('');
    setShowCoverFinderModal(false);
    setTimeout(() => setCoverToast(null), 3000);
  };

  const handleAutoFindCoverNow = async () => {
    setIsSearchingCover(true);
    try {
      const found = await fetchOriginalCoverArt(track.artist, track.title, track.album);
      if (found && found.coverUrl) {
        if (onUpdateTrackCover) {
          onUpdateTrackCover(track.id, found.coverUrl, found.album, found.year);
        }
        setCoverToast(`¡Carátula oficial de "${found.album}" aplicada!`);
        setTimeout(() => setCoverToast(null), 3000);
      } else {
        handleOpenCoverFinder();
      }
    } catch (e) {
      handleOpenCoverFinder();
    } finally {
      setIsSearchingCover(false);
    }
  };

  const handleScreenTap = () => {
    onTogglePlay();
    const nextAction = isPlaying ? 'pause' : 'play';
    setHudFeedback(nextAction);
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => {
      setHudFeedback(null);
    }, 600);
  };


  // Sync editable lyrics when track changes
  useEffect(() => {
    setEditableLyrics(track.lyrics);
    setIsEditingLyrics(false);
  }, [track.id, track.lyrics]);

  // Gentle auto-scroll when playing
  useEffect(() => {
    if (isPlaying && autoScroll && lyricsContainerRef.current && activeTab === 'lyrics') {
      const container = lyricsContainerRef.current;
      const progress = duration > 0 ? currentTime / duration : 0;
      const targetScroll = (container.scrollHeight - container.clientHeight) * progress;
      container.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
  }, [currentTime, duration, isPlaying, autoScroll, activeTab]);

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      const currentTrackWithLyrics = {
        ...track,
        lyrics: editableLyrics,
      };
      const doc = await generateTrackPDF(currentTrackWithLyrics);
      const filename = `${track.artist} - ${track.title} [${track.trackNumber}].pdf`.replace(/[/\\?%*:|"<>]/g, '-');
      doc.save(filename);
      setPdfDownloaded(true);
      setTimeout(() => setPdfDownloaded(false), 4000);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyLyrics = () => {
    navigator.clipboard.writeText(editableLyrics);
    setCopiedLyrics(true);
    setTimeout(() => setCopiedLyrics(false), 2000);
  };

  const handleSaveLyrics = () => {
    if (onUpdateTrackLyrics) {
      onUpdateTrackLyrics(editableLyrics);
    }
    setIsEditingLyrics(false);
  };

  return (
    <div
      ref={screenContainerRef}
      id="screen-descriptor"
      className="relative flex flex-col h-full bg-zinc-900/90 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden backdrop-blur-md touch-pan-y"
    >
      {/* Tab Swipe HUD feedback */}
      {tabSwipeHint && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all">
          <div className="px-3 py-1 rounded-full bg-zinc-900/95 border border-amber-500/50 text-amber-300 font-mono text-[11px] font-bold shadow-lg backdrop-blur-md flex items-center gap-1.5 animate-pulse">
            <span>⇄</span>
            <span>{tabSwipeHint}</span>
          </div>
        </div>
      )}

      {/* Tab Navigation Header */}
      <div className="flex items-center justify-between px-2 sm:px-3 py-1 sm:py-2 landscape:py-1 bg-zinc-950/80 border-b border-zinc-800 select-none">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            id="tab-btn-video"
            onClick={() => onTabChange('video')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'video'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Video</span>
          </button>

          <button
            id="tab-btn-cover"
            onClick={() => onTabChange('cover')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'cover'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Cover</span>
          </button>

          <button
            id="tab-btn-lyrics"
            onClick={() => onTabChange('lyrics')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'lyrics'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Letra</span>
          </button>

          <button
            id="tab-btn-pdf"
            onClick={() => onTabChange('pdf')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'pdf'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Exportar</span>
            <span>PDF</span>
          </button>
        </div>

        {/* Status / Quick Action Badge & Playlist Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Active Playlist Badge if active */}
          {activePlaylistName && (
            <button
              onClick={onOpenPlaylists}
              className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-[11px] font-mono text-amber-400 font-bold hover:bg-amber-500/25 transition-colors"
              title="Lista de reproducción activa"
            >
              <ListMusic className="w-3 h-3" />
              <span>{activePlaylistName}</span>
            </button>
          )}

          {/* Ver lista de reproducción button */}
          {onOpenPlaylists && (
            <button
              onClick={onOpenPlaylists}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 hover:text-amber-400 transition-colors"
              title="Ver lista de reproducción"
            >
              <ListMusic className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Ver Lista</span>
            </button>
          )}

          {/* Quick Add to Playlist Dropdown */}
          {playlists.length > 0 && onAddCurrentTrackToPlaylist && (
            <div className="relative">
              <button
                onClick={() => setShowPlaylistDropdown(!showPlaylistDropdown)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-amber-400 transition-colors"
                title="Añadir esta pista a una lista de reproducción"
              >
                <ListPlus className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">+ Lista</span>
              </button>

              {showPlaylistDropdown && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-zinc-950 border border-zinc-700 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 text-left">
                  <p className="text-[10px] font-mono text-zinc-400 px-2 py-1 border-b border-zinc-800 font-semibold">
                    Añadir este video a:
                  </p>
                  <div className="max-h-40 overflow-y-auto py-1 space-y-0.5">
                    {playlists.map((pl) => {
                      const inList = pl.trackIds.includes(track.id);
                      return (
                        <button
                          key={pl.id}
                          onClick={() => {
                            onAddCurrentTrackToPlaylist(pl.id);
                            setPlaylistAddedToast(`Añadido a ${pl.name}`);
                            setShowPlaylistDropdown(false);
                            setTimeout(() => setPlaylistAddedToast(null), 2500);
                          }}
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
                  {onOpenPlaylists && (
                    <button
                      onClick={() => {
                        setShowPlaylistDropdown(false);
                        onOpenPlaylists();
                      }}
                      className="w-full text-left px-2 py-1 text-[10px] text-amber-400 hover:text-amber-300 font-medium border-t border-zinc-800 block mt-1"
                    >
                      + Gestionar todas las listas...
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[11px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
              {track.trackNumber}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Sistema en línea" />
          </div>
        </div>
      </div>

      {/* Toast confirmation */}
      {playlistAddedToast && (
        <div className="absolute top-12 right-4 z-50 px-3 py-1.5 bg-emerald-600 text-white font-medium text-xs rounded-lg shadow-xl animate-in fade-in">
          {playlistAddedToast}
        </div>
      )}


      {/* Main Screen Body with Dynamic Ambient Glow */}
      <div
        className={`relative flex-1 min-h-0 bg-zinc-950/60 overflow-hidden transition-all duration-700 ${
          isPlaying ? 'shadow-[0_0_35px_rgba(245,158,11,0.2)]' : ''
        }`}
      >
        {/* VIEW 1: ONLY THE PURE VIDEO (NO PLAYBACK TOOLS OR YOUTUBE BANNERS) */}
        {/* Kept permanently mounted with CSS visibility toggling so the video never resets or reloads when browsing lyrics, covers or PDF */}
        <div
          className={`relative w-full h-full bg-black flex items-center justify-center overflow-hidden select-none ${
            activeTab === 'video' ? 'block' : 'hidden'
          }`}
        >
          {/* Top & Bottom Zero-Leak Edge Guards: Physical matte borders that completely clip out any 1px title or watermark edge regardless of phone aspect ratio */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-black z-25 pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-black z-25 pointer-events-none" />

          {/* Transparent Touch Shield: Intercepts all touches/clicks to prevent YouTube's 
              mobile HUD (play, pause, rewind, fast-forward/next arrow) from ever appearing */}
          <div
            id="video-touch-shield"
            onClick={handleScreenTap}
            className="absolute inset-0 z-30 bg-transparent select-none cursor-pointer"
            title={isPlaying ? "Tocar para pausar" : "Tocar para reproducir"}
          />

          {/* Quick HUD Tap Feedback Icon (Flashes momentarily when tapping the video) */}
          {hudFeedback && (
            <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 rounded-full bg-zinc-950/85 border border-amber-500/70 shadow-[0_0_30px_rgba(245,158,11,0.6)] backdrop-blur-md flex items-center justify-center text-amber-400">
                {hudFeedback === 'play' ? (
                  <Play className="w-8 h-8 fill-amber-400 ml-1" />
                ) : (
                  <Pause className="w-8 h-8 fill-amber-400" />
                )}
              </div>
            </div>
          )}

          {/* MODO ESPERA DINÁMICO (STANDBY): Completely covers YouTube's initial thumbnail and giant center Play button when stopped or awaiting start */}
          {!isPlaying && currentTime === 0 && (
            <div
              onClick={handleScreenTap}
              className="absolute inset-0 z-35 bg-zinc-950 flex flex-col items-center justify-center p-4 text-center overflow-hidden cursor-pointer select-none group"
            >
              {/* Ambient Blurred Artwork Backdrop */}
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30 blur-2xl scale-125 transition-transform duration-1000 group-hover:scale-110"
                style={{ backgroundImage: `url(${track.coverUrl})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/90" />
              {/* Subtle CRT Scanline effect */}
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] opacity-75" />

              <div className="relative z-10 flex flex-col items-center gap-2.5 sm:gap-3 max-w-sm">
                {/* Status LED Chip */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/90 border border-amber-500/40 text-[10px] sm:text-[11px] font-mono font-bold text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>SISTEMA LISTO • MODO ESPERA</span>
                </div>

                {/* Animated Audio Radar Spectrum Bars */}
                <div className="flex items-end gap-1 h-8 sm:h-9 py-1">
                  {[35, 60, 85, 50, 95, 70, 45, 90, 60, 80, 50, 75, 90, 65, 40].map((h, i) => (
                    <div
                      key={i}
                      className="w-1 sm:w-1.5 rounded-full bg-gradient-to-t from-amber-600 via-amber-400 to-amber-300 animate-radar"
                      style={{
                        height: `${h}%`,
                        animationDelay: `${(i * 0.1).toFixed(2)}s`,
                      }}
                    />
                  ))}
                </div>

                {/* Track Metadata in Hi-Fi Aesthetic */}
                <div className="space-y-0.5 sm:space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-zinc-100 tracking-tight line-clamp-1">
                    {track.title}
                  </h3>
                  <p className="text-xs sm:text-sm font-medium text-amber-400 font-mono">
                    {track.artist}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    {track.trackNumber} • SIDE {track.side} • STEREO HI-FI 24-BIT
                  </p>
                </div>

                {/* Touch to play button */}
                <div className="mt-1 flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/25 transition-all group-hover:scale-105 active:scale-95">
                  {isResolvingVideo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                      <span>SINTONIZANDO VIDEO...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-zinc-950" />
                      <span>REPRODUCIR VIDEO</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PAUSA AUDIOVISUAL: Conceals YouTube's center pause icon and suggestion cards when paused mid-song */}
          {!isPlaying && currentTime > 0 && (
            <div
              onClick={handleScreenTap}
              className="absolute inset-0 z-35 bg-zinc-950/65 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 cursor-pointer select-none group"
            >
              <div className="px-5 py-2.5 rounded-full bg-zinc-950/95 border border-amber-500/60 shadow-[0_0_30px_rgba(245,158,11,0.35)] flex items-center gap-3 text-amber-400 font-mono text-xs font-bold tracking-wider group-hover:scale-105 transition-transform">
                <Pause className="w-4 h-4 fill-amber-400 text-amber-400 animate-pulse" />
                <span>PAUSA AUDIOVISUAL • {formatTime(currentTime)}</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400 mt-2">
                Toque la pantalla o presione PLAY para continuar
              </span>
            </div>
          )}

          {/* Cropped Video Container: 145% width and height centered inside overflow-hidden.
              No playlist parameter prevents next-arrow buttons.
              Crops out YouTube's top title bar, channel name/avatar, 
              and bottom "Mirar en YouTube" watermark + link icons completely! */}
          <div className="relative w-[145%] h-[145%] shrink-0 flex items-center justify-center pointer-events-none select-none">
            <iframe
              id="youtube-embed-iframe"
              key={resolvedVideoId || track.id}
              src={`https://www.youtube-nocookie.com/embed/${resolvedVideoId || 'fJ9rUzIMcZQ'}?enablejsapi=1&autoplay=0&controls=0&modestbranding=1&showinfo=0&rel=0&iv_load_policy=3&fs=0&disablekb=1&playsinline=1`}
              title={`${track.artist} - ${track.title}`}
              className="w-full h-full border-0 pointer-events-none"
              tabIndex={-1}
              aria-hidden="true"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        </div>

        {/* VIEW 2: COVER */}
        {activeTab === 'cover' && (
          <div className="w-full h-full p-4 overflow-y-auto flex flex-col md:flex-row items-center justify-center gap-6">
            {/* Album Cover Art with Smooth Fade-in */}
            <div className="relative group shrink-0">
              <div className="relative w-48 h-48 sm:w-60 sm:h-60 rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-500/30 ring-1 ring-white/10">
                <SmoothCoverImage
                  src={track.coverUrl}
                  alt={`${track.title} cover`}
                  aspectRatio="aspect-square"
                  roundedClass="rounded-2xl"
                  showSpinEffect
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80 pointer-events-none" />
                <div className="absolute bottom-3 left-3 right-3 text-white pointer-events-none">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-bold block">
                    ALBUM ARTWORK
                  </span>
                  <p className="font-bold text-sm truncate">{track.album}</p>
                </div>

                {/* Quick change cover button on hover */}
                <button
                  type="button"
                  onClick={handleOpenCoverFinder}
                  className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 text-white transition-opacity backdrop-blur-xs cursor-pointer p-4 text-center z-20"
                >
                  <Search className="w-6 h-6 text-amber-400" />
                  <span className="text-xs font-bold text-zinc-100">Cambiar / Buscar Carátula Original</span>
                  <span className="text-[10px] text-amber-400 font-mono">Apple Music / iTunes HD</span>
                </button>
              </div>

              {/* Vinyl Badge Peeking Behind */}
              <div className="absolute -top-2 -right-2 bg-amber-500 text-zinc-950 font-bold text-[10px] px-2 py-0.5 rounded-full shadow-lg z-10">
                SIDE {track.side}
              </div>
            </div>

            {/* Technical Track Information */}
            <div className="flex-1 max-w-md w-full bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <span className="text-xs font-mono font-bold text-amber-400 tracking-wider">
                  {track.trackNumber.toUpperCase()}
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')} MIN
                </span>
              </div>

              <h2 className="mt-2 text-xl font-bold text-zinc-100">{track.title}</h2>
              <p className="text-sm font-medium text-amber-500">{track.artist}</p>

              <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                <div className="bg-zinc-950/60 p-2 rounded border border-zinc-800/80">
                  <span className="text-zinc-500 text-[10px] block font-mono">ÁLBUM</span>
                  <span className="font-medium text-zinc-200 truncate block">{track.album}</span>
                </div>
                <div className="bg-zinc-950/60 p-2 rounded border border-zinc-800/80">
                  <span className="text-zinc-500 text-[10px] block font-mono">AÑO</span>
                  <span className="font-medium text-zinc-200 block">{track.year}</span>
                </div>
                <div className="bg-zinc-950/60 p-2 rounded border border-zinc-800/80">
                  <span className="text-zinc-500 text-[10px] block font-mono">GÉNERO</span>
                  <span className="font-medium text-zinc-200 truncate block">{track.genre}</span>
                </div>
                <div className="bg-zinc-950/60 p-2 rounded border border-zinc-800/80">
                  <span className="text-zinc-500 text-[10px] block font-mono">FORMATO</span>
                  <span className="font-medium text-zinc-200 block">Stereo Hi-Fi</span>
                </div>
              </div>

              {/* Cover Art Search & Auto-Upgrade Bar */}
              <div className="mt-3 p-2 rounded-lg bg-zinc-950/60 border border-zinc-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Disc3 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-[11px] text-zinc-300 truncate">Carátula oficial de estudio</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleAutoFindCoverNow}
                    disabled={isSearchingCover}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[11px] font-bold border border-amber-500/30 transition-colors disabled:opacity-50"
                    title="Buscar carátula oficial en Apple Music automáticamente"
                  >
                    {isSearchingCover ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    <span>Auto-Buscar HD</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenCoverFinder}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium transition-colors"
                  >
                    <Search className="w-3 h-3 text-zinc-400" />
                    <span>Explorar</span>
                  </button>
                </div>
              </div>

              {track.customNotes && (
                <div className="mt-3 p-2.5 rounded bg-zinc-950/50 border border-zinc-800/60 text-xs text-zinc-400">
                  <p className="text-[10px] uppercase font-mono text-zinc-500 mb-1">Notas de Producción:</p>
                  <p className="leading-relaxed">{track.customNotes}</p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => onTabChange('lyrics')}
                  className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
                >
                  <Music className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ver Letra</span>
                </button>
                <button
                  onClick={() => onTabChange('pdf')}
                  className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Exportar PDF</span>
                </button>
                {onOpenPlaylists && (
                  <button
                    onClick={onOpenPlaylists}
                    className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-bold text-zinc-950 transition-colors"
                  >
                    <ListMusic className="w-3.5 h-3.5" />
                    <span>Mis Listas</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: LETRA (LYRICS) */}
        {activeTab === 'lyrics' && (
          <div className="w-full h-full flex flex-col p-3 sm:p-4">
            {/* Lyrics Toolbar */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-200">
                  Letra de {track.title}
                </span>
                <span className="text-xs text-zinc-500 hidden sm:inline">
                  • {track.artist}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Auto-scroll toggle */}
                <button
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                    autoScroll
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                  title="Auto-desplazamiento al reproducir"
                >
                  <Sparkles className="w-3 h-3" />
                  <span className="hidden sm:inline text-[11px]">Auto-scroll</span>
                </button>

                {/* Font Size controls */}
                <div className="flex items-center bg-zinc-800/80 rounded border border-zinc-700/60 p-0.5">
                  <button
                    onClick={() => setFontSize('sm')}
                    className={`px-1.5 py-0.5 rounded text-[11px] ${fontSize === 'sm' ? 'bg-zinc-700 text-amber-400 font-bold' : 'text-zinc-400'}`}
                    title="Letra pequeña"
                  >
                    A-
                  </button>
                  <button
                    onClick={() => setFontSize('base')}
                    className={`px-1.5 py-0.5 rounded text-[11px] ${fontSize === 'base' ? 'bg-zinc-700 text-amber-400 font-bold' : 'text-zinc-400'}`}
                    title="Letra estándar"
                  >
                    A
                  </button>
                  <button
                    onClick={() => setFontSize('lg')}
                    className={`px-1.5 py-0.5 rounded text-[11px] ${fontSize === 'lg' ? 'bg-zinc-700 text-amber-400 font-bold' : 'text-zinc-400'}`}
                    title="Letra grande"
                  >
                    A+
                  </button>
                </div>

                {/* Copy lyrics */}
                <button
                  onClick={handleCopyLyrics}
                  className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                  title="Copiar letra al portapapeles"
                >
                  {copiedLyrics ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Edit Lyrics Toggle */}
                <button
                  onClick={() => setIsEditingLyrics(!isEditingLyrics)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    isEditingLyrics
                      ? 'bg-amber-500 text-zinc-950 font-bold'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Editar letra del tema"
                >
                  {isEditingLyrics ? 'Cancelar' : 'Editar'}
                </button>
              </div>
            </div>

            {/* Lyrics Content Display / Editor */}
            {isEditingLyrics ? (
              <div className="flex-1 flex flex-col gap-2">
                <textarea
                  value={editableLyrics}
                  onChange={(e) => setEditableLyrics(e.target.value)}
                  className="w-full flex-1 p-3 bg-zinc-950 rounded-lg border border-amber-500/50 text-zinc-200 font-mono text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                  placeholder="Escribe o pega la letra del tema aquí..."
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditingLyrics(false)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-medium"
                  >
                    Descartar
                  </button>
                  <button
                    onClick={handleSaveLyrics}
                    className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-bold text-zinc-950"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            ) : (
              <div
                ref={lyricsContainerRef}
                className="flex-1 overflow-y-auto pr-1 space-y-1.5 select-none scroll-smooth"
              >
                {parsedLyrics.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-10">
                    <Music className="w-8 h-8 mb-2 opacity-50 text-amber-500" />
                    <p className="text-xs font-mono">Sin letra disponible</p>
                  </div>
                ) : (
                  parsedLyrics.map((line, idx) => {
                    const isActive = idx === activeLineIndex;
                    const isPast = activeLineIndex > -1 && idx < activeLineIndex;

                    return (
                      <div
                        key={line.id}
                        id={`sync-lyric-line-${idx}`}
                        onClick={() => onSeek && onSeek(line.timeSeconds)}
                        className={`group relative flex items-start gap-2.5 sm:gap-3 p-2 sm:p-2.5 rounded-xl cursor-pointer transition-all ${
                          isActive
                            ? 'bg-amber-500/20 border-l-4 border-amber-500 text-amber-200 shadow-lg shadow-amber-500/10 scale-[1.01]'
                            : isPast
                            ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                            : 'text-zinc-300 hover:text-white hover:bg-zinc-900/60'
                        }`}
                        title={`Reproducir video desde ${line.formattedTime}`}
                      >
                        {/* Timestamp badge */}
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors shrink-0 mt-0.5 ${
                            isActive
                              ? 'bg-amber-500 text-zinc-950 font-bold'
                              : 'bg-zinc-900/90 text-zinc-500 group-hover:text-amber-400 border border-zinc-800'
                          }`}
                        >
                          {line.formattedTime}
                        </span>

                        {/* Lyric text */}
                        <p
                          className={`flex-1 leading-relaxed transition-all ${
                            fontSize === 'sm'
                              ? 'text-xs'
                              : fontSize === 'lg'
                              ? 'text-base sm:text-lg'
                              : 'text-sm sm:text-base'
                          } ${
                            isActive
                              ? 'font-bold text-amber-100 drop-shadow-[0_1px_8px_rgba(245,158,11,0.5)]'
                              : line.isStanzaHeader
                              ? 'text-amber-400/90 font-medium italic'
                              : ''
                          }`}
                        >
                          {line.text}
                        </p>

                        {/* Live Playing Marker */}
                        {isActive && (
                          <div className="flex items-center gap-1 shrink-0 mt-1">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                            <span className="text-[9px] font-mono font-bold text-amber-400 hidden sm:inline">
                              PLAYING
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: EXPORTAR A PDF (VISTA PREVIA COMPLETA INTERACTIVA) */}
        {activeTab === 'pdf' && (
          <div className="w-full h-full p-2 sm:p-4 overflow-hidden flex flex-col items-center justify-center">
            <PDFPreview
              track={track}
              onDownload={handleExportPDF}
              isExporting={isExporting}
              pdfDownloaded={pdfDownloaded}
            />
          </div>
        )}
      </div>
    </div>
  );
};
