import { useEffect } from 'react';
import { Track, PlayerState } from '../types';
import { backgroundAudioEngine } from '../utils/backgroundAudioEngine';

interface UseMediaSessionProps {
  track: Track;
  playerState: PlayerState;
  onTogglePlay: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onSeek: (seconds: number) => void;
  onRewind10: () => void;
  onForward10: () => void;
}

export function useMediaSession({
  track,
  playerState,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  onSeek,
  onRewind10,
  onForward10,
}: UseMediaSessionProps) {
  // Sync background audio keep-alive carrier with player state
  useEffect(() => {
    if (playerState.isPlaying) {
      backgroundAudioEngine.startKeepAlive();
    } else {
      backgroundAudioEngine.stopKeepAlive();
    }

    return () => {
      backgroundAudioEngine.stopKeepAlive();
    };
  }, [playerState.isPlaying]);

  // Sync MediaSession metadata and controls
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    // Set Android/iOS lock screen track info
    try {
      const artworks: MediaImage[] = [
        {
          src: track.coverUrl || '/app-icon.png',
          sizes: '512x512',
          type: 'image/png',
        },
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
      ];

      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: `${track.album} • Cassette Hi-Fi`,
        artwork: artworks,
      });

      navigator.mediaSession.playbackState = playerState.isPlaying ? 'playing' : 'paused';
    } catch (e) {
      console.warn('Error setting MediaSession metadata:', e);
    }

    // Set position state on modern browsers
    try {
      if (
        'setPositionState' in navigator.mediaSession &&
        typeof playerState.duration === 'number' &&
        playerState.duration > 0 &&
        typeof playerState.currentTime === 'number'
      ) {
        navigator.mediaSession.setPositionState({
          duration: playerState.duration,
          playbackRate: 1,
          position: Math.min(playerState.currentTime, playerState.duration),
        });
      }
    } catch (e) {
      // Ignore position state sync if unsupported or transient out of bounds
    }

    // Register Media Session action handlers for the lock screen & notifications
    const actionHandlers: Array<[MediaSessionAction, MediaSessionActionHandler | null]> = [
      ['play', () => onTogglePlay()],
      ['pause', () => onTogglePlay()],
      ['previoustrack', () => onPrevTrack()],
      ['nexttrack', () => onNextTrack()],
      ['seekbackward', () => onRewind10()],
      ['seekforward', () => onForward10()],
      [
        'seekto',
        (details) => {
          if (typeof details.seekTime === 'number') {
            onSeek(details.seekTime);
          }
        },
      ],
    ];

    actionHandlers.forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (err) {
        // Some actions might not be supported on specific browsers
      }
    });

    return () => {
      // Clean up action handlers on unmount
      actionHandlers.forEach(([action]) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch (e) {}
      });
    };
  }, [
    track.id,
    track.title,
    track.artist,
    track.album,
    track.coverUrl,
    playerState.isPlaying,
    playerState.duration,
    playerState.currentTime,
    onTogglePlay,
    onNextTrack,
    onPrevTrack,
    onSeek,
    onRewind10,
    onForward10,
  ]);
}
