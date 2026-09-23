import React from 'react';
import { Disc3, ListMusic } from 'lucide-react';

interface HeaderProps {
  isPlaying: boolean;
  activeTrackNumber: string;
  activePlaylistName?: string | null;
  playlistCount: number;
  onOpenPlaylists: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isPlaying,
  activeTrackNumber,
  activePlaylistName,
  playlistCount,
  onOpenPlaylists,
}) => {
  return (
    <header className="w-full bg-zinc-950/90 border-b border-zinc-800/80 backdrop-blur-md px-2.5 sm:px-4 py-1 sm:py-2 landscape:py-1 flex items-center justify-between select-none shrink-0 h-10 sm:h-12 landscape:h-10">
      {/* Brand Identity */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm shrink-0">
          <Disc3 className={`w-4 h-4 sm:w-5 sm:h-5 ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`} />
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <h1 className="text-xs sm:text-sm font-bold tracking-wider text-zinc-100 uppercase font-mono flex items-center gap-1">
            <span>HI-FI PLAYER</span>
            <span className="text-[9px] text-amber-500 font-semibold px-1 py-0.2 bg-amber-500/10 rounded border border-amber-500/20 hidden sm:inline">
              AUDIO HD
            </span>
          </h1>
          <span className="text-[10px] font-mono text-zinc-500 hidden lg:inline">
            • STUDIO ANALOG CONSOLE
          </span>
        </div>
      </div>

      {/* Retro Deck Status Badges & Playlists Trigger */}
      <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] font-mono">
        {/* Prominent Ver Lista de Reproducción Button */}
        <button
          id="btn-open-playlists"
          onClick={onOpenPlaylists}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border transition-all shadow-md active:scale-95 ${
            activePlaylistName
              ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 hover:bg-amber-500/30'
              : 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:text-white hover:bg-zinc-800 hover:border-amber-500/50'
          }`}
          title="Ver lista de reproducción y gestionar colecciones"
        >
          <ListMusic className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-bold text-xs truncate max-w-[140px] sm:max-w-[200px]">
            {activePlaylistName ? `Lista: ${activePlaylistName}` : 'Ver lista de reproducción'}
          </span>
          <span className="px-1.5 py-0.5 rounded-md bg-zinc-800/90 text-[10px] text-amber-400 font-bold border border-zinc-700">
            {playlistCount}
          </span>
        </button>

        {/* Audio status */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
          <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
          <span className="text-[9px]">{isPlaying ? 'PLAYING' : 'PAUSED'}</span>
        </div>

        {/* Active track indicator */}
        <div className="px-1.5 sm:px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-amber-400 font-bold text-[10px]">
          {activeTrackNumber}
        </div>
      </div>
    </header>
  );
};
