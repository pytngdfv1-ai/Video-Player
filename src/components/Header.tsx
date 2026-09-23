import React from 'react';
import { Disc3, ListMusic, Tv } from 'lucide-react';

interface HeaderProps {
  isPlaying: boolean;
  activeTrackNumber: string;
  activePlaylistName?: string | null;
  playlistCount: number;
  onOpenPlaylists: () => void;
  onOpenSmartTVCast?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isPlaying,
  activeTrackNumber,
  activePlaylistName,
  playlistCount,
  onOpenPlaylists,
  onOpenSmartTVCast,
}) => {
  return (
    <header className="w-full bg-zinc-950/90 border-b border-zinc-800/80 backdrop-blur-md px-2.5 sm:px-4 py-1 sm:py-2 landscape:py-1 flex items-center justify-between select-none shrink-0 h-10 sm:h-12 landscape:h-10">
      {/* Brand Identity */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)] shrink-0 bg-zinc-900 group">
          <img
            src="/app-icon.jpg"
            alt="YouTube Cassette Player Icon"
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
              isPlaying ? 'brightness-110' : 'opacity-90'
            }`}
            referrerPolicy="no-referrer"
          />
          {isPlaying && (
            <span className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500 ring-1 ring-zinc-950 animate-pulse" />
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <h1 className="text-xs sm:text-sm font-bold tracking-wider text-zinc-100 uppercase font-mono flex items-center gap-1.5">
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
              MIXCASETE
            </span>
            <span className="text-[9px] text-amber-500 font-semibold px-1 py-0.2 bg-amber-500/10 rounded border border-amber-500/20 hidden sm:inline">
              HI-FI VINTAGE
            </span>
          </h1>
          <span className="text-[10px] font-mono text-zinc-500 hidden lg:inline">
            • YT STEREO CONSOLE
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

        {/* Smart TV Cast Button */}
        {onOpenSmartTVCast && (
          <button
            id="btn-smart-tv"
            onClick={onOpenSmartTVCast}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-amber-400 hover:border-amber-500/50 hover:bg-zinc-800 transition-all shadow-md active:scale-95"
            title="Compartir y transmitir a Smart TV / Chromecast"
          >
            <Tv className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
            <span className="font-bold text-xs hidden md:inline">Smart TV</span>
          </button>
        )}

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
