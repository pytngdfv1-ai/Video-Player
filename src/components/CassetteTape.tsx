import React from 'react';
import { Track } from '../types';

interface CassetteTapeProps {
  track: Track;
  isPlaying: boolean;
  progress: number; // 0 to 1
  currentTime: number;
  duration?: number;
  activePlaylistName?: string | null;
  isRecordingFeedback?: boolean;
  playlistTracks?: Track[];
}

export const CassetteTape: React.FC<CassetteTapeProps> = ({
  track,
  isPlaying,
  progress,
  activePlaylistName,
  isRecordingFeedback = false,
}) => {
  // Proportional tape roll width (20px to 44px)
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const leftTapeWidth = Math.max(18, Math.round(44 - clampedProgress * 24));
  const rightTapeWidth = Math.max(18, Math.round(20 + clampedProgress * 24));

  return (
    <div className="w-full h-full flex items-center justify-center py-0.5 sm:py-1 overflow-hidden select-none">
      {/* <!-- Exact Replica: The Rolling Stones - Paint it Black / @Mix.Casete (Dark Mode Label) --> */}
      <div className="wrap scale-[0.52] xs:scale-[0.58] landscape:scale-[0.56] landscape:xs:scale-[0.62] landscape:sm:scale-[0.72] sm:scale-75 md:scale-85 lg:scale-95 xl:scale-100 transition-transform origin-center">
        <div className="cassette">
          {/* 4 Silver Precision Corner Screws */}
          <div className="screw" title="Tornillo Superior Izquierdo"></div>
          <div className="screw" title="Tornillo Superior Derecho"></div>
          <div className="screw" title="Tornillo Inferior Izquierdo"></div>
          <div className="screw" title="Tornillo Inferior Derecho"></div>

          {/* Two-Tone Classic Label in MODO OSCURO (Dark Mode) */}
          <div className="label">
            {/* Top Dark Strip with Bold Artist - Song Title */}
            <div className="label-top-strip-dark">
              <div className="flex items-center justify-center w-full px-2">
                <span className="font-oswald text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 uppercase truncate text-center drop-shadow-sm">
                  {track.artist} - {track.title}
                </span>
                {isRecordingFeedback && (
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white font-mono text-[10px] font-black animate-pulse shadow-md shrink-0">
                    ● REC
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Dark-Amber Lower Deck */}
            <div className="label-bottom-deck-dark">
              {/* Middle Section: [Side A/B Badge] [Center Reels Capsule] [60 MIN. Badge] */}
              <div className="flex items-center justify-between gap-2 px-2">
                {/* Left Side: Square Dark Box with Gold 'A' */}
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-[#121317] rounded-xs border-2 border-amber-500/90 shadow-md flex items-center justify-center shrink-0">
                  <span className="font-mono text-2xl sm:text-3xl font-black text-amber-400 leading-none">
                    {track.side || 'A'}
                  </span>
                </div>

                {/* Center: Dark Pill Capsule Window with White Cog Gears and Glossy Black Spherical Dome Hubs */}
                <div className="reels-capsule">
                  {/* Left Cog Hub (Wound Tape Pack) */}
                  <div className="relative flex items-center justify-center">
                    {/* Magnetic ferric tape pack behind hub */}
                    <div
                      className="absolute rounded-full bg-gradient-to-r from-[#21130a] via-[#3a2012] to-[#1c0f08] transition-all duration-300 shadow-md border border-[#482818]/60"
                      style={{
                        width: `${leftTapeWidth * 2}px`,
                        height: `${leftTapeWidth * 2}px`,
                      }}
                    />

                    {/* Rotating White Gear Teeth with Black Glossy Dome Cap */}
                    <div
                      className={`dark-reel-hub ${
                        isPlaying ? 'animate-[spin_2.5s_linear_infinite]' : ''
                      }`}
                      title="Carrete Izquierdo"
                    >
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>

                  {/* Center Rectangular Gauge Window */}
                  <div className="dark-window-gauge">
                    {/* Magnetic tape roll and white leader strip */}
                    <div className="relative w-full h-7 flex items-center justify-center overflow-hidden">
                      <div className="w-8 h-full bg-[#351d10] border-x border-[#482818]" />
                      <div className="w-10 h-full bg-white/90 shadow-inner" />
                    </div>

                    {/* Gauge Calibration Scale: 100 | 50 | 0 */}
                    <div className="w-full flex items-center justify-between px-3 text-[9px] font-mono text-zinc-400 font-bold select-none border-t border-zinc-700/60 pt-0.5">
                      <span>100</span>
                      <div className="w-[1px] h-2 bg-zinc-500" />
                      <span>50</span>
                      <div className="w-[1px] h-2 bg-zinc-500" />
                      <span>0</span>
                    </div>
                  </div>

                  {/* Right Cog Hub (Take-up Tape Pack) */}
                  <div className="relative flex items-center justify-center">
                    {/* Magnetic ferric tape pack behind hub */}
                    <div
                      className="absolute rounded-full bg-gradient-to-r from-[#21130a] via-[#3a2012] to-[#1c0f08] transition-all duration-300 shadow-md border border-[#482818]/60"
                      style={{
                        width: `${rightTapeWidth * 2}px`,
                        height: `${rightTapeWidth * 2}px`,
                      }}
                    />

                    {/* Rotating White Gear Teeth with Black Glossy Dome Cap */}
                    <div
                      className={`dark-reel-hub ${
                        isPlaying ? 'animate-[spin_2.5s_linear_infinite]' : ''
                      }`}
                      title="Carrete Derecho"
                    >
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>

                {/* Right Side: 60 MIN. Badge */}
                <div className="flex flex-col items-center justify-center font-oswald text-amber-300 shrink-0 select-none drop-shadow-sm">
                  <span className="text-2xl sm:text-3xl font-black leading-none tracking-tight">
                    60
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-black tracking-widest leading-none mt-0.5 text-amber-200">
                    MIN.
                  </span>
                </div>
              </div>

              {/* Bottom Center of Label: @Mix.Casete */}
              <div className="text-center font-sans font-bold text-amber-100 text-sm sm:text-base tracking-wide pb-1 drop-shadow-sm">
                {activePlaylistName ? `@${activePlaylistName}` : '@Mix.Casete'}
              </div>
            </div>
          </div>

          {/* Bottom Trapezoid Head Notch (with 2 round holes, 2 square slots, and 1 center screw) */}
          <div className="dark-cassette-head">
            {/* Left Round White Guide Hole */}
            <div className="guide-hole-round" title="Guía circular izquierda" />

            {/* Left Square White Alignment Slot */}
            <div className="guide-slot-square" title="Ranura cuadrada izquierda" />

            {/* Center Head Silver Screw */}
            <div className="center-head-screw" title="Tornillo central de cabezal" />

            {/* Right Square White Alignment Slot */}
            <div className="guide-slot-square" title="Ranura cuadrada derecha" />

            {/* Right Round White Guide Hole */}
            <div className="guide-hole-round" title="Guía circular derecha" />
          </div>
        </div>
      </div>
    </div>
  );
};
