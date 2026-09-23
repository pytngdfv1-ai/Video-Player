import React from 'react';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Repeat,
  Circle,
  ListMusic,
} from 'lucide-react';
import { PlayerState, Track } from '../types';

interface PlayerControlsProps {
  track: Track;
  playerState: PlayerState;
  onTogglePlay: () => void;
  onStop: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onSeek: (time: number) => void;
  onRewind10: () => void;
  onForward10: () => void;
  onToggleMute: () => void;
  onVolumeChange: (vol: number) => void;
  onToggleLoop: () => void;
  onRecordTrack: () => void;
  isRecordingFeedback?: boolean;
  onOpenPlaylists?: () => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  playerState,
  onTogglePlay,
  onStop,
  onNextTrack,
  onPrevTrack,
  onSeek,
  onRewind10,
  onForward10,
  onToggleMute,
  onVolumeChange,
  onToggleLoop,
  onRecordTrack,
  isRecordingFeedback = false,
  onOpenPlaylists,
}) => {
  const { isPlaying, currentTime, duration, volume, isMuted, isLooping } = playerState;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newPercent = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(newPercent * duration);
  };

  return (
    <div id="player-controls-section" className="w-full max-w-xl mx-auto space-y-1.5 sm:space-y-2 landscape:space-y-1 px-1 sm:px-2 select-none">
      {/* Progress Timeline */}
      <div className="space-y-0.5">
        <div
          onClick={handleTimelineClick}
          className="group relative w-full h-2 sm:h-2.5 landscape:h-1.5 bg-zinc-900 rounded-full cursor-pointer hover:h-3 transition-all overflow-hidden border border-zinc-700/60 shadow-inner"
        >
          {/* Progress fill */}
          <div
            className="h-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-300 transition-all duration-100 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]"
            style={{ width: `${progressPercent}%` }}
          />
          {/* Thumb Indicator */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -ml-1.5 border-2 border-amber-600 ring-2 ring-black/40"
            style={{ left: `${progressPercent}%` }}
          />
        </div>

        {/* Time Stamp Indicators */}
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 px-1">
          <span className="text-amber-400 font-semibold tracking-wider">{formatTime(currentTime)}</span>
          <span className="text-zinc-500 font-medium tracking-wider">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Transport Mechanical Bar */}
      <div className="flex items-center justify-between gap-1 sm:gap-2 landscape:gap-1 bg-gradient-to-b from-zinc-900/95 to-zinc-950 p-1.5 sm:p-2 landscape:p-1 rounded-xl border border-zinc-800 shadow-xl backdrop-blur-md">
        {/* VINTAGE RECORD BUTTON (REC) */}
        <button
          id="btn-rec-playlist"
          onClick={onRecordTrack}
          className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-all active:scale-95 shadow-md ${
            isRecordingFeedback
              ? 'bg-red-600 text-white border-2 border-red-300 shadow-[0_0_15px_rgba(239,68,68,0.8)] scale-105'
              : 'bg-red-950/80 hover:bg-red-900/90 text-red-400 border border-red-700/80 hover:border-red-500 hover:text-red-200'
          }`}
          title="GRABAR (REC): Añade la pista actual a tu lista de reproducción"
        >
          <span className="relative flex h-2.5 w-2.5 items-center justify-center">
            {isRecordingFeedback && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            )}
            <Circle className={`w-2 h-2 fill-current ${isRecordingFeedback ? 'text-white' : 'text-red-500'}`} />
          </span>
          <span className="tracking-wider uppercase text-[10px] font-black">REC</span>
        </button>

        {/* Skip Previous Track */}
        <button
          id="btn-prev-track"
          onClick={onPrevTrack}
          className="p-1.5 sm:p-2 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white active:scale-95 transition-all shadow-sm border border-zinc-700/40"
          title="Pista anterior"
        >
          <SkipBack className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Rewind 10 Seconds */}
        <button
          id="btn-rewind-10"
          onClick={onRewind10}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 active:scale-95 transition-all hidden xs:flex"
          title="Retroceder 10 segundos"
        >
          <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Central Mechanical PLAY / PAUSE Button */}
        <button
          id="btn-play-pause"
          onClick={onTogglePlay}
          className="p-2 sm:p-2.5 landscape:p-2 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-400 hover:from-amber-500 hover:to-amber-300 text-zinc-950 font-black shadow-md shadow-amber-500/30 active:scale-95 transition-all border border-amber-300/40"
          title={isPlaying ? 'Pausar' : 'Reproducir'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 sm:w-5.5 sm:h-5.5 fill-current" />
          ) : (
            <Play className="w-5 h-5 sm:w-5.5 sm:h-5.5 fill-current translate-x-0.5" />
          )}
        </button>

        {/* STOP Button */}
        <button
          id="btn-stop-track"
          onClick={onStop}
          className="p-2 sm:p-2.5 landscape:p-2 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-amber-400 active:scale-95 transition-all shadow-md border border-zinc-700/60"
          title="Detener (Stop) y volver al inicio"
        >
          <Square className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-current" />
        </button>

        {/* Forward 10 Seconds */}
        <button
          id="btn-forward-10"
          onClick={onForward10}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 active:scale-95 transition-all hidden xs:flex"
          title="Avanzar 10 segundos"
        >
          <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Skip Next Track */}
        <button
          id="btn-next-track"
          onClick={onNextTrack}
          className="p-1.5 sm:p-2 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white active:scale-95 transition-all shadow-sm border border-zinc-700/40"
          title="Siguiente pista"
        >
          <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Loop / Repeat Button */}
        <button
          id="btn-toggle-loop"
          onClick={onToggleLoop}
          className={`p-1.5 sm:p-2 rounded-lg transition-all active:scale-95 border ${
            isLooping
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-800/60'
          }`}
          title={isLooping ? 'Bucle activado' : 'Repetir tema'}
        >
          <Repeat className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Ver Lista de Reproducción Button */}
        {onOpenPlaylists && (
          <button
            id="btn-view-playlists-controls"
            onClick={onOpenPlaylists}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-amber-400 hover:text-amber-300 font-mono text-xs font-bold transition-all border border-zinc-700/60 shadow-md active:scale-95 shrink-0"
            title="Ver lista de reproducción"
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ver Lista</span>
          </button>
        )}

        {/* Volume Control */}
        <div className="flex items-center gap-1 pl-1 border-l border-zinc-800/80">
          <button
            id="btn-toggle-mute"
            onClick={onToggleMute}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
            title={isMuted ? 'Activar sonido' : 'Silenciar'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>

          <input
            id="input-volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-12 sm:w-16 landscape:w-14 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            title={`Volumen: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
          />
        </div>
      </div>
    </div>
  );
};
