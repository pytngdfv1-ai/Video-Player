import React, { useEffect, useState, useRef } from 'react';
import { Track } from '../types';
import { Disc3, Activity, Gauge } from 'lucide-react';

interface HiFiConsoleProps {
  track: Track;
  isPlaying: boolean;
  activePlaylistName?: string | null;
  isRecordingFeedback?: boolean;
}

export const HiFiConsole: React.FC<HiFiConsoleProps> = ({
  track,
  isPlaying,
  activePlaylistName,
  isRecordingFeedback = false,
}) => {
  // Stereo VU levels (0 - 100)
  const [vuLeft, setVuLeft] = useState(0);
  const [vuRight, setVuRight] = useState(0);
  const [peakLeft, setPeakLeft] = useState(0);
  const [peakRight, setPeakRight] = useState(0);

  const animFrameRef = useRef<number | null>(null);
  const peakHoldLeft = useRef(0);
  const peakHoldRight = useRef(0);
  const peakCounterLeft = useRef(0);
  const peakCounterRight = useRef(0);

  // Responsive VU meter dynamic ballistics engine
  useEffect(() => {
    if (!isPlaying) {
      setVuLeft(0);
      setVuRight(0);
      setPeakLeft(0);
      setPeakRight(0);
      peakHoldLeft.current = 0;
      peakHoldRight.current = 0;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const renderVu = (now: number) => {
      // Natural musical rhythm dynamics with transient peaks
      const tempo = (now / 1000) * 2.2;
      const kickPulse = Math.pow(Math.max(0, Math.sin(tempo * Math.PI)), 5);
      const snarePulse = Math.pow(Math.max(0, Math.sin((tempo + 0.5) * Math.PI)), 7);
      const bassGroove = Math.sin(tempo * 0.5 * Math.PI) * 10;
      const tapeNoise = Math.sin(now / 110) * 6;

      // Realistic L/R stereo variance
      const targetL = Math.min(98, Math.max(14, 52 + kickPulse * 40 + snarePulse * 28 + bassGroove + tapeNoise));
      const targetR = Math.min(98, Math.max(14, 50 + kickPulse * 38 + snarePulse * 30 - bassGroove * 0.8 + Math.cos(now / 130) * 6));

      // Fast attack & analog ballistic smoothing
      setVuLeft((prev) => {
        const next = prev < targetL ? prev * 0.55 + targetL * 0.45 : prev * 0.88 + targetL * 0.12;
        // Peak Hold logic for Left Channel
        if (next >= peakHoldLeft.current) {
          peakHoldLeft.current = next;
          peakCounterLeft.current = 18;
        } else if (peakCounterLeft.current > 0) {
          peakCounterLeft.current--;
        } else {
          peakHoldLeft.current = Math.max(next, peakHoldLeft.current - 2.5);
        }
        setPeakLeft(peakHoldLeft.current);
        return next;
      });

      setVuRight((prev) => {
        const next = prev < targetR ? prev * 0.55 + targetR * 0.45 : prev * 0.88 + targetR * 0.12;
        // Peak Hold logic for Right Channel
        if (next >= peakHoldRight.current) {
          peakHoldRight.current = next;
          peakCounterRight.current = 18;
        } else if (peakCounterRight.current > 0) {
          peakCounterRight.current--;
        } else {
          peakHoldRight.current = Math.max(next, peakHoldRight.current - 2.5);
        }
        setPeakRight(peakHoldRight.current);
        return next;
      });

      animFrameRef.current = requestAnimationFrame(renderVu);
    };

    animFrameRef.current = requestAnimationFrame(renderVu);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isPlaying]);

  return (
    <div className="w-full flex-1 flex flex-col justify-center items-center p-2 sm:p-3 overflow-hidden select-none">
      {/* Hi-Fi Chassis Main Frame */}
      <div className="w-full max-w-xl bg-gradient-to-b from-zinc-900 via-zinc-900/95 to-zinc-950 rounded-2xl border border-zinc-800 shadow-2xl p-3 sm:p-4 flex flex-col gap-3 relative overflow-hidden">
        {/* Subtle Brushed Metal Accent Border */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

        {/* Top Deck Info Bar */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-amber-500 font-bold uppercase block">
                CONSOLA STEREO MASTER HI-FI
              </span>
              <span className="text-xs font-bold text-zinc-200">
                {activePlaylistName ? `LISTA: ${activePlaylistName}` : 'MODO MASTER DIRECT'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isRecordingFeedback && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white font-mono text-[10px] font-black animate-pulse shadow-md">
                ● REC
              </span>
            )}
            <span className="px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60 font-mono text-[10px] text-zinc-300 font-bold">
              24-BIT / 96kHz
            </span>
          </div>
        </div>

        {/* Center Section: Full-Width High-Precision Dual VU Meter Deck */}
        <div className="bg-zinc-950 rounded-xl border border-zinc-800/90 p-3 sm:p-4 flex flex-col gap-3 shadow-inner">
          {/* Header Scale & Peak Alert */}
          <div className="flex items-center justify-between text-[11px] font-mono">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                ANALOG VU METERS
              </span>
              <span className="text-[10px] text-zinc-500 hidden sm:inline">PEAK RESPONSE: FAST</span>
            </div>

            {/* Decibel Marks Reference Bar */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 font-mono">-20 -10 -7 -5 -3 0 +3 dB</span>
              {(vuLeft > 88 || vuRight > 88) && (
                <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/50 text-[9px] font-bold animate-pulse">
                  PEAK CLIP
                </span>
              )}
            </div>
          </div>

          {/* Left Channel Meter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 font-bold text-amber-400 text-[10px]">
                  CH-L
                </span>
                <span className="text-[11px] text-zinc-300 font-bold">LEFT CHANNEL</span>
              </div>
              <span className="text-[11px] text-zinc-400 font-mono font-medium">
                {isPlaying ? `${Math.round(vuLeft)}%` : 'MUTED'}
              </span>
            </div>

            <div className="relative w-full h-3.5 bg-zinc-900/90 rounded-full overflow-hidden p-0.5 border border-zinc-800">
              {/* Peak Hold Indicator */}
              {isPlaying && peakLeft > 10 && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-amber-200 rounded-full shadow-[0_0_6px_rgba(253,230,138,0.9)] z-10 transition-all duration-75"
                  style={{ left: `${Math.min(99, Math.max(1, peakLeft))}%` }}
                />
              )}
              {/* Dynamic VU Bar */}
              <div
                className="h-full rounded-full transition-all duration-75 bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                style={{ width: `${Math.min(100, Math.max(0, vuLeft))}%` }}
              />
            </div>
          </div>

          {/* Right Channel Meter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 font-bold text-amber-400 text-[10px]">
                  CH-R
                </span>
                <span className="text-[11px] text-zinc-300 font-bold">RIGHT CHANNEL</span>
              </div>
              <span className="text-[11px] text-zinc-400 font-mono font-medium">
                {isPlaying ? `${Math.round(vuRight)}%` : 'MUTED'}
              </span>
            </div>

            <div className="relative w-full h-3.5 bg-zinc-900/90 rounded-full overflow-hidden p-0.5 border border-zinc-800">
              {/* Peak Hold Indicator */}
              {isPlaying && peakRight > 10 && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-amber-200 rounded-full shadow-[0_0_6px_rgba(253,230,138,0.9)] z-10 transition-all duration-75"
                  style={{ left: `${Math.min(99, Math.max(1, peakRight))}%` }}
                />
              )}
              {/* Dynamic VU Bar */}
              <div
                className="h-full rounded-full transition-all duration-75 bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                style={{ width: `${Math.min(100, Math.max(0, vuRight))}%` }}
              />
            </div>
          </div>

          {/* Calibrated dB Scale Legend */}
          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pt-1 border-t border-zinc-900/80 px-1">
            <span>-30dB</span>
            <span>-20dB</span>
            <span>-10dB</span>
            <span>-5dB</span>
            <span className="text-amber-400 font-bold">0dB (CAL)</span>
            <span className="text-red-400 font-bold">+3dB</span>
          </div>
        </div>

        {/* Bottom Current Track Display Banner */}
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-950/80 rounded-xl border border-zinc-800">
          <div className="flex items-center gap-2.5 truncate">
            <div className={`w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
              <Disc3 className="w-5 h-5 text-amber-400" />
            </div>
            <div className="truncate">
              <p className="text-xs sm:text-sm font-bold text-zinc-100 truncate">
                {track.title}
              </p>
              <p className="text-[11px] font-medium text-amber-400/90 truncate">
                {track.artist} • <span className="text-zinc-400">{track.album}</span>
              </p>
            </div>
          </div>

          <div className="text-right shrink-0 pl-2">
            <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono font-bold text-amber-400 block">
              {track.trackNumber}
            </span>
            <span className="text-[9px] font-mono text-zinc-500 block mt-0.5">
              SIDE {track.side}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};



