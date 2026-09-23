import React, { useState, useEffect } from 'react';
import { Disc3 } from 'lucide-react';

interface SmoothCoverImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: string;
  roundedClass?: string;
  showSpinEffect?: boolean;
}

export const SmoothCoverImage: React.FC<SmoothCoverImageProps> = ({
  src,
  alt,
  className = '',
  aspectRatio = 'aspect-square',
  roundedClass = 'rounded-2xl',
  showSpinEffect = false,
}) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!src) return;
    if (src === currentSrc && isLoaded) return;

    // Start transition
    setIsLoaded(false);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;

    img.onload = () => {
      setCurrentSrc(src);
      // Small tick for smooth CSS transition trigger
      requestAnimationFrame(() => {
        setIsLoaded(true);
      });
    };

    img.onerror = () => {
      // Fallback
      setCurrentSrc(src);
      setIsLoaded(true);
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, currentSrc, isLoaded]);

  return (
    <div className={`relative overflow-hidden ${aspectRatio} ${roundedClass} bg-zinc-950 ${className}`}>
      {/* Background ambient blur layer for rich depth */}
      <div
        className={`absolute inset-0 bg-cover bg-center blur-md scale-110 opacity-30 transition-opacity duration-700 ease-in-out ${
          isLoaded ? 'opacity-30' : 'opacity-10'
        }`}
        style={{ backgroundImage: `url(${currentSrc})` }}
      />

      {/* Loading Skeleton / Placeholder */}
      <div
        className={`absolute inset-0 flex items-center justify-center bg-zinc-900/80 transition-opacity duration-500 ease-in-out z-10 ${
          isLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <Disc3 className="w-8 h-8 text-amber-500/40 animate-spin" />
      </div>

      {/* Main Image with Smooth Fade-In and subtle scale settling */}
      <img
        src={currentSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        className={`w-full h-full object-cover transition-all duration-700 ease-out transform ${
          isLoaded
            ? 'opacity-100 scale-100 filter-none'
            : 'opacity-0 scale-[1.03] blur-xs'
        } ${showSpinEffect ? 'group-hover:scale-105' : ''}`}
      />
    </div>
  );
};
