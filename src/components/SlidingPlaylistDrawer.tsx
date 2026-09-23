import React, { useState, useRef } from 'react';
import {
  ListMusic,
  Play,
  Plus,
  ChevronRight,
  ChevronLeft,
  X,
  Disc3,
  ExternalLink,
  Layers,
  Sparkles,
  Music2,
  Clock,
} from 'lucide-react';
import { Playlist, Track } from '../types';
import { useSwipeGesture } from '../hooks/useSwipeGesture';

interface SlidingPlaylistDrawerProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  playlists: Playlist[];
  activePlaylistId: string | null;
  allTracks: Track[];
  currentTrackId: string;
  onSelectPlaylistToPlay: (playlistId: string, startTrackIndex?: number) => void;
  onOpenFullModal: () => void;
  onCreatePlaylist: (name: string, description?: string) => void;
}

const CASSETTE_COLOR_STYLES: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  amber: {
    border: 'border-amber-500/40 hover:border-amber-400',
    bg: 'from-amber-950/40 to-zinc-900/90',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  emerald: {
    border: 'border-emerald-500/40 hover:border-emerald-400',
    bg: 'from-emerald-950/40 to-zinc-900/90',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  cyan: {
    border: 'border-cyan-500/40 hover:border-cyan-400',
    bg: 'from-cyan-950/40 to-zinc-900/90',
    text: 'text-cyan-400',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  },
  rose: {
    border: 'border-rose-500/40 hover:border-rose-400',
    bg: 'from-rose-950/40 to-zinc-900/90',
    text: 'text-rose-400',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  },
  purple: {
    border: 'border-purple-500/40 hover:border-purple-400',
    bg: 'from-purple-950/40 to-zinc-900/90',
    text: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
};

export const SlidingPlaylistDrawer: React.FC<SlidingPlaylistDrawerProps> = ({
  isOpen,
  onOpen,
  onClose,
  playlists,
  activePlaylistId,
  allTracks,
  currentTrackId,
  onSelectPlaylistToPlay,
  onOpenFullModal,
  onCreatePlaylist,
}) => {
  const [expandedPlaylistId, setExpandedPlaylistId] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Swipe right on the drawer to close it smoothly
  useSwipeGesture({
    targetRef: drawerRef,
    onSwipeRight: onClose,
    threshold: 40,
    disabled: !isOpen,
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    onCreatePlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
    setIsCreatingInline(false);
  };

  return (
    <>
      {/* Backdrop overlay when open on small screens */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Floating Edge Trigger / Pull Handle (Always accessible on right edge) */}
      <button
        onClick={() => (isOpen ? onClose() : onOpen())}
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-40 transition-all duration-300 flex items-center gap-1.5 py-3 px-2 sm:px-2.5 rounded-l-2xl border-y border-l shadow-[0_0_20px_rgba(0,0,0,0.8)] select-none group cursor-pointer ${
          isOpen
            ? 'translate-x-full opacity-0 pointer-events-none'
            : 'bg-zinc-900/95 border-amber-500/40 text-amber-300 hover:bg-zinc-800 hover:border-amber-400 hover:scale-105 active:scale-95'
        }`}
        title="Desliza o haz clic para ver tus listas de reproducción"
        aria-label="Abrir panel deslizable de listas de reproducción"
      >
        <ChevronLeft className="w-4 h-4 text-amber-400 animate-pulse group-hover:-translate-x-0.5 transition-transform" />
        <div className="flex flex-col items-center">
          <ListMusic className="w-4 h-4 text-amber-400 mb-0.5" />
          <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-mono tracking-widest font-bold uppercase text-amber-300">
            LISTAS
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1" />
        </div>
      </button>

      {/* Slide-out Cassette Library Drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 h-full w-[88vw] sm:w-[380px] md:w-[420px] max-w-full bg-zinc-950/95 border-l border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.9)] z-50 flex flex-col backdrop-blur-xl transition-transform duration-300 ease-out select-none ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header with Cassette Deck Aesthetics */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Disc3 className="w-4 h-4 animate-[spin_6s_linear_infinite]" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-mono font-bold tracking-wider text-zinc-100 uppercase flex items-center gap-1.5">
                <span>COLECCIÓN CASETES</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {playlists.length}
                </span>
              </h2>
              <p className="text-[10px] font-mono text-zinc-400">Desliza a la derecha para cerrar</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                onClose();
                onOpenFullModal();
              }}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 transition-colors"
              title="Abrir gestor completo"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Cerrar panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="p-3 border-b border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={() => setIsCreatingInline(!isCreatingInline)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 text-xs font-mono font-bold transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Lista</span>
          </button>
          <button
            onClick={() => {
              onClose();
              onOpenFullModal();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800/80 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700 text-xs font-mono transition-all active:scale-95"
          >
            <Layers className="w-3.5 h-3.5 text-zinc-400" />
            <span>Gestionar</span>
          </button>
        </div>

        {/* Inline Create Form */}
        {isCreatingInline && (
          <form
            onSubmit={handleCreateSubmit}
            className="p-3 border-b border-amber-500/30 bg-amber-500/5 flex flex-col gap-2 shrink-0"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Nombre del nuevo casete..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-mono text-zinc-100 focus:outline-none focus:border-amber-400"
                autoFocus
              />
              <button
                type="submit"
                disabled={!newPlaylistName.trim()}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-zinc-950 font-bold text-xs font-mono hover:bg-amber-400 disabled:opacity-50"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingInline(false)}
                className="p-1.5 text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* Cassette Rack List (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
          {playlists.map((playlist) => {
            const isActive = playlist.id === activePlaylistId;
            const isExpanded = playlist.id === expandedPlaylistId;
            const colorKey = playlist.color || 'amber';
            const colorStyle = CASSETTE_COLOR_STYLES[colorKey] || CASSETTE_COLOR_STYLES.amber;
            const playlistTracks = playlist.trackIds
              .map((id) => allTracks.find((t) => t.id === id))
              .filter((t): t is Track => t !== undefined);

            return (
              <div
                key={playlist.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden bg-gradient-to-r ${
                  colorStyle.bg
                } ${
                  isActive
                    ? 'border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/40'
                    : colorStyle.border
                }`}
              >
                {/* Cassette Spine / Card Header */}
                <div className="p-2.5 flex items-center justify-between gap-2 cursor-pointer">
                  <div
                    className="flex-1 flex items-center gap-2.5 min-w-0"
                    onClick={() => setExpandedPlaylistId(isExpanded ? null : playlist.id)}
                  >
                    {/* Retro Reel Hub Icon */}
                    <div
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      <Disc3
                        className={`w-4 h-4 ${
                          isActive ? 'animate-[spin_4s_linear_infinite] text-amber-400' : ''
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-zinc-100 truncate">
                          {playlist.name}
                        </span>
                        {isActive && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-bold uppercase shrink-0">
                            SONANDO
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 mt-0.5">
                        <span>{playlistTracks.length} pistas</span>
                        <span>•</span>
                        <span className="truncate">{playlist.description || 'MixCasete Hi-Fi'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Play Cassette Button */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        onSelectPlaylistToPlay(playlist.id, 0);
                        onClose();
                      }}
                      className={`p-2 rounded-xl transition-transform active:scale-90 flex items-center justify-center ${
                        isActive
                          ? 'bg-amber-500 text-zinc-950 font-bold shadow-md'
                          : 'bg-zinc-800 text-zinc-200 hover:bg-amber-500 hover:text-zinc-950'
                      }`}
                      title="Reproducir este casete completo"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button
                      onClick={() => setExpandedPlaylistId(isExpanded ? null : playlist.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white"
                      title={isExpanded ? 'Contraer' : 'Ver pistas'}
                    >
                      <ChevronRight
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Expanded Track List Inside Mixtape */}
                {isExpanded && (
                  <div className="border-t border-zinc-800/80 bg-zinc-950/70 p-2 space-y-1">
                    {playlistTracks.length === 0 ? (
                      <div className="text-center py-3 text-[11px] font-mono text-zinc-500">
                        Este casete está vacío. Añade pistas con el botón REC.
                      </div>
                    ) : (
                      playlistTracks.map((track, idx) => {
                        const isThisTrackPlaying = isActive && track.id === currentTrackId;
                        return (
                          <div
                            key={track.id}
                            onClick={() => {
                              onSelectPlaylistToPlay(playlist.id, idx);
                              onClose();
                            }}
                            className={`flex items-center justify-between p-1.5 rounded-xl cursor-pointer transition-all ${
                              isThisTrackPlaying
                                ? 'bg-amber-500/20 text-amber-300 font-bold'
                                : 'hover:bg-zinc-800/70 text-zinc-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] font-mono text-zinc-500 w-4 text-center">
                                {(idx + 1).toString().padStart(2, '0')}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-mono truncate">{track.title}</p>
                                <p className="text-[10px] text-zinc-500 truncate">{track.artist}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              {isThisTrackPlaying ? (
                                <Disc3 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                              ) : (
                                <Play className="w-3 h-3 text-zinc-500 opacity-60" />
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Swipe Hint */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/90 text-center shrink-0">
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-zinc-400">
            <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
            <span>Desliza a la derecha en la pantalla para cerrar</span>
          </div>
        </div>
      </div>
    </>
  );
};
