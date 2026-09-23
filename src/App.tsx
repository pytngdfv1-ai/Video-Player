/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { ScreenDescriptor } from './components/ScreenDescriptor';
import { HiFiConsole } from './components/HiFiConsole';
import { PlayerControls } from './components/PlayerControls';
import { FloatingSearch } from './components/FloatingSearch';
import { PlaylistModal } from './components/PlaylistModal';
import { SlidingPlaylistDrawer } from './components/SlidingPlaylistDrawer';
import { useSwipeGesture } from './hooks/useSwipeGesture';
import { DEFAULT_TRACKS, DEFAULT_PLAYLISTS } from './data/defaultTracks';
import { Track, ViewTab, PlayerState, Playlist } from './types';

export default function App() {
  const [tracks, setTracks] = useState<Track[]>(() => {
    const saved = localStorage.getItem('yt_cassette_tracks');
    if (saved) {
      try {
        const parsed: Track[] = JSON.parse(saved);
        // Automatically upgrade any legacy tracks that had placeholder unsplash images
        return parsed.map((t) => {
          const defaultMatch = DEFAULT_TRACKS.find((d) => d.id === t.id);
          if (defaultMatch && (t.coverUrl?.includes('images.unsplash.com') || !t.coverUrl)) {
            return { ...t, coverUrl: defaultMatch.coverUrl };
          }
          return t;
        });
      } catch (e) {
        console.error('Failed to parse saved tracks', e);
      }
    }
    return DEFAULT_TRACKS;
  });

  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    const saved = localStorage.getItem('yt_cassette_playlists');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved playlists', e);
      }
    }
    return DEFAULT_PLAYLISTS;
  });

  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isSlidingDrawerOpen, setIsSlidingDrawerOpen] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<ViewTab>('video');
  const [isRecordingFeedback, setIsRecordingFeedback] = useState(false);
  const [recToast, setRecToast] = useState<string | null>(null);
  const [trackSwipeToast, setTrackSwipeToast] = useState<{ type: 'next' | 'prev'; title: string } | null>(null);
  const consoleSectionRef = useRef<HTMLElement>(null);

  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: DEFAULT_TRACKS[0]?.duration || 355,
    volume: 0.85,
    isMuted: false,
    isLooping: false,
    isShuffling: false,
  });

  // Save tracks to localStorage whenever updated
  useEffect(() => {
    localStorage.setItem('yt_cassette_tracks', JSON.stringify(tracks));
  }, [tracks]);

  // Save playlists to localStorage whenever updated
  useEffect(() => {
    localStorage.setItem('yt_cassette_playlists', JSON.stringify(playlists));
  }, [playlists]);

  // Derive active playlist object
  const activePlaylist = useMemo(
    () => playlists.find((p) => p.id === activePlaylistId) || null,
    [playlists, activePlaylistId]
  );

  // Derive playable tracks sequence (playlist tracks if active playlist is selected, else all tracks)
  const playableTracks = useMemo(() => {
    if (!activePlaylist) return tracks;
    const list = activePlaylist.trackIds
      .map((id) => tracks.find((t) => t.id === id))
      .filter((t): t is Track => t !== undefined);
    return list.length > 0 ? list : tracks;
  }, [activePlaylist, tracks]);

  const safeIndex = currentTrackIndex < playableTracks.length ? currentTrackIndex : 0;
  const currentTrack = playableTracks[safeIndex] || tracks[0] || DEFAULT_TRACKS[0];

  // When current track changes, reset timer and duration
  useEffect(() => {
    setPlayerState((prev) => ({
      ...prev,
      currentTime: 0,
      duration: currentTrack.duration || 240,
    }));
  }, [currentTrack.id, currentTrack.duration]);

  // When track changes while in playing state, automatically start playing the new track
  useEffect(() => {
    if (playerState.isPlaying) {
      const timer = setTimeout(() => {
        try {
          const iframe = document.getElementById('youtube-embed-iframe') as HTMLIFrameElement;
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
            iframe.contentWindow.postMessage(
              `{"event":"command","func":"setVolume","args":[${Math.round(playerState.volume * 100)}]}`,
              '*'
            );
            iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          }
        } catch (e) {
          console.warn('Track switch playback error:', e);
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [currentTrack.id, playerState.isPlaying]);

  const handleNextTrack = useCallback(() => {
    if (playerState.isShuffling && playableTracks.length > 1) {
      let randIdx = Math.floor(Math.random() * playableTracks.length);
      while (randIdx === currentTrackIndex) {
        randIdx = Math.floor(Math.random() * playableTracks.length);
      }
      setCurrentTrackIndex(randIdx);
    } else {
      setCurrentTrackIndex((prev) => (prev + 1) % playableTracks.length);
    }
  }, [currentTrackIndex, playableTracks.length, playerState.isShuffling]);

  const handlePrevTrack = () => {
    // If playing for more than 3 seconds, restart current track; otherwise go to previous in sequence
    if (playerState.currentTime > 3) {
      setPlayerState((prev) => ({ ...prev, currentTime: 0 }));
      handleSeek(0);
    } else {
      setCurrentTrackIndex((prev) => (prev - 1 + playableTracks.length) % playableTracks.length);
    }
  };

  // Swipe on Hi-Fi Audio Console to change tracks
  useSwipeGesture({
    targetRef: consoleSectionRef,
    onSwipeLeft: () => {
      handleNextTrack();
      setTrackSwipeToast({ type: 'next', title: 'Pista Siguiente' });
      setTimeout(() => setTrackSwipeToast(null), 1500);
    },
    onSwipeRight: () => {
      handlePrevTrack();
      setTrackSwipeToast({ type: 'prev', title: 'Pista Anterior' });
      setTimeout(() => setTrackSwipeToast(null), 1500);
    },
    threshold: 45,
  });

  // Global right-to-left swipe to slide in the playlist drawer
  useSwipeGesture({
    onSwipeLeft: () => {
      if (!isSlidingDrawerOpen && !isPlaylistModalOpen) {
        setIsSlidingDrawerOpen(true);
      }
    },
    threshold: 75,
  });

  // Listen to real YouTube Player API events via postMessage
  useEffect(() => {
    const handleYouTubeMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data || data.event !== 'infoDelivery' || !data.info) return;

        // Sync real YouTube duration if provided
        if (typeof data.info.duration === 'number' && data.info.duration > 0) {
          const roundedDur = Math.round(data.info.duration);
          setPlayerState((prev) => (prev.duration !== roundedDur ? { ...prev, duration: roundedDur } : prev));
        }

        // Sync real playback time when actively playing
        if (typeof data.info.currentTime === 'number') {
          setPlayerState((prev) => {
            if (prev.isPlaying) {
              const sec = Math.floor(data.info.currentTime);
              return Math.abs(prev.currentTime - sec) >= 1 ? { ...prev, currentTime: sec } : prev;
            }
            return prev;
          });
        }

        // Handle video finish: playerState === 0 (ENDED)
        if (typeof data.info.playerState === 'number' && data.info.playerState === 0) {
          setPlayerState((prev) => {
            if (prev.isLooping) {
              const iframe = document.getElementById('youtube-embed-iframe') as HTMLIFrameElement;
              if (iframe?.contentWindow) {
                iframe.contentWindow.postMessage('{"event":"command","func":"seekTo","args":[0, true]}', '*');
                iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
              }
              return { ...prev, currentTime: 0 };
            } else {
              handleNextTrack();
              return prev;
            }
          });
        }
      } catch {
        // Ignore non-YouTube / non-JSON postMessages
      }
    };

    window.addEventListener('message', handleYouTubeMessage);
    return () => window.removeEventListener('message', handleYouTubeMessage);
  }, [handleNextTrack]);

  // Fallback Playback timer ticker for cassette reels & UI responsiveness
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (playerState.isPlaying) {
      interval = setInterval(() => {
        setPlayerState((prev) => {
          if (prev.duration > 0 && prev.currentTime >= prev.duration) {
            if (prev.isLooping) {
              return { ...prev, currentTime: 0 };
            } else {
              handleNextTrack();
              return prev;
            }
          }
          return { ...prev, currentTime: prev.currentTime + 1 };
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [playerState.isPlaying, playerState.isLooping, playerState.duration, handleNextTrack]);

  const handleTogglePlay = () => {
    setPlayerState((prev) => {
      const nextIsPlaying = !prev.isPlaying;
      try {
        const iframe = document.getElementById('youtube-embed-iframe') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
          if (nextIsPlaying) {
            // Unmute, set volume and play video
            iframe.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
            iframe.contentWindow.postMessage(`{"event":"command","func":"setVolume","args":[${Math.round(prev.volume * 100)}]}`, '*');
            iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          } else {
            // Pause video and audio completely so the video halts immediately
            iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
          }
        }
      } catch (e) {
        console.warn('YouTube postMessage error:', e);
      }
      return { ...prev, isPlaying: nextIsPlaying };
    });
  };

  const handleStop = () => {
    setPlayerState((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
    try {
      const iframe = document.getElementById('youtube-embed-iframe') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        // Pause video immediately so it freezes/stops completely
        iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        // Rewind playback position to 0:00
        iframe.contentWindow.postMessage('{"event":"command","func":"seekTo","args":[0, true]}', '*');
        // Ensure it stays paused at frame 0 and does not auto-resume
        iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
      }
    } catch (e) {
      console.warn('YouTube stop postMessage error:', e);
    }
  };

  const handleSeek = (newTime: number) => {
    setPlayerState((prev) => ({ ...prev, currentTime: newTime }));
    try {
      const iframe = document.getElementById('youtube-embed-iframe') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          `{"event":"command","func":"seekTo","args":[${newTime}, true]}`,
          '*'
        );
        // If player is not actively playing, keep it paused at the seek position
        if (!playerState.isPlaying) {
          iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        }
      }
    } catch (e) {
      console.warn('Seek postMessage error:', e);
    }
  };

  const handleRewind10 = () => {
    const target = Math.max(0, playerState.currentTime - 10);
    handleSeek(target);
  };

  const handleForward10 = () => {
    const target = Math.min(playerState.duration, playerState.currentTime + 10);
    handleSeek(target);
  };

  const handleToggleMute = () => {
    setPlayerState((prev) => {
      const nextMuted = !prev.isMuted;
      try {
        const iframe = document.getElementById('youtube-embed-iframe') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            nextMuted ? '{"event":"command","func":"mute","args":""}' : '{"event":"command","func":"unMute","args":""}',
            '*'
          );
        }
      } catch (e) {
        console.warn('Mute postMessage error:', e);
      }
      return { ...prev, isMuted: nextMuted };
    });
  };

  const handleVolumeChange = (vol: number) => {
    setPlayerState((prev) => ({
      ...prev,
      volume: vol,
      isMuted: vol === 0,
    }));
    try {
      const iframe = document.getElementById('youtube-embed-iframe') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          `{"event":"command","func":"setVolume","args":[${Math.round(vol * 100)}]}`,
          '*'
        );
      }
    } catch (e) {
      console.warn('Volume postMessage error:', e);
    }
  };

  const handleToggleLoop = () => {
    setPlayerState((prev) => ({ ...prev, isLooping: !prev.isLooping }));
  };

  // REC Functionality: records current track to the playlist
  const handleRecordTrack = () => {
    setIsRecordingFeedback(true);
    setTimeout(() => setIsRecordingFeedback(false), 2000);

    let targetId = activePlaylistId;
    let targetName = '';

    if (!targetId) {
      if (playlists.length > 0) {
        targetId = playlists[0].id;
        targetName = playlists[0].name;
      } else {
        const newId = `playlist-${Date.now()}`;
        const newPlaylist: Playlist = {
          id: newId,
          name: 'Mixtape Favoritos',
          description: 'Grabaciones de cassette personalizadas',
          trackIds: [currentTrack.id],
          createdAt: Date.now(),
          color: 'red',
        };
        setPlaylists([newPlaylist]);
        setRecToast(`🔴 GRABADO: "${currentTrack.title}" guardada en "Mixtape Favoritos"`);
        setTimeout(() => setRecToast(null), 3500);
        return;
      }
    } else {
      const pl = playlists.find((p) => p.id === targetId);
      targetName = pl?.name || 'Lista de reproducción';
    }

    const existingPl = playlists.find((p) => p.id === targetId);
    const alreadyIn = existingPl?.trackIds.includes(currentTrack.id);

    if (alreadyIn) {
      setRecToast(`🔴 "${currentTrack.title}" ya está grabada en "${targetName}"`);
    } else {
      handleAddTrackToPlaylist(targetId, currentTrack.id);
      const totalTracks = (existingPl?.trackIds.length || 0) + 1;
      setRecToast(`🔴 GRABADO: "${currentTrack.title}" guardada en "${targetName}" (Pista #${totalTracks})`);
    }
    setTimeout(() => setRecToast(null), 3500);
  };

  const handleSelectTrack = (track: Track) => {
    const idx = playableTracks.findIndex((t) => t.id === track.id);
    if (idx !== -1) {
      setCurrentTrackIndex(idx);
    } else {
      // If not in currently active playlist, switch back to all tracks or prepend
      setTracks((prev) => (prev.some((t) => t.id === track.id) ? prev : [track, ...prev]));
      setActivePlaylistId(null);
      setCurrentTrackIndex(0);
    }
    setPlayerState((prev) => ({ ...prev, isPlaying: true, currentTime: 0 }));
  };

  const handleAddCustomTrack = (newTrack: Track, targetPlaylistId?: string) => {
    setTracks((prev) => [newTrack, ...prev]);
    if (targetPlaylistId) {
      handleAddTrackToPlaylist(targetPlaylistId, newTrack.id);
    }
    setCurrentTrackIndex(0);
    setPlayerState((prev) => ({ ...prev, isPlaying: true, currentTime: 0 }));
  };

  const handleUpdateTrackLyrics = (newLyrics: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === currentTrack.id ? { ...t, lyrics: newLyrics } : t))
    );
  };

  const handleUpdateTrackCover = useCallback(
    (trackId: string, newCoverUrl: string, album?: string, year?: number) => {
      setTracks((prev) =>
        prev.map((t) => {
          if (t.id === trackId) {
            return {
              ...t,
              coverUrl: newCoverUrl,
              album: album || t.album,
              year: year || t.year,
            };
          }
          return t;
        })
      );
    },
    []
  );

  // Playlist Operations
  const handleCreatePlaylist = (name: string, description?: string, color = 'amber'): string => {
    const newId = `playlist-${Date.now()}`;
    const newPlaylist: Playlist = {
      id: newId,
      name,
      description,
      trackIds: [],
      createdAt: Date.now(),
      color,
    };
    setPlaylists((prev) => [...prev, newPlaylist]);
    return newId;
  };

  const handleRenamePlaylist = (id: string, newName: string, newDescription?: string) => {
    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, name: newName, description: newDescription ?? p.description } : p
      )
    );
  };

  const handleDeletePlaylist = (id: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
    if (activePlaylistId === id) {
      setActivePlaylistId(null);
      setCurrentTrackIndex(0);
    }
  };

  const handleImportPlaylist = (data: {
    playlistName: string;
    description?: string;
    newTracks: Track[];
  }) => {
    // 1. Add any imported tracks that are not yet in the master track list
    setTracks((prev) => {
      const existingIds = new Set(prev.map((t) => t.id));
      const filteredNew = data.newTracks.filter((t) => !existingIds.has(t.id));
      return [...filteredNew, ...prev];
    });

    // 2. Create the new playlist
    const newId = `playlist-${Date.now()}`;
    const newPlaylist: Playlist = {
      id: newId,
      name: data.playlistName,
      description: data.description || 'Lista importada MixCasete',
      trackIds: data.newTracks.map((t) => t.id),
      createdAt: Date.now(),
      color: 'amber',
    };
    setPlaylists((prev) => [newPlaylist, ...prev]);
    setActivePlaylistId(newId);
    setCurrentTrackIndex(0);
    setPlayerState((prev) => ({ ...prev, isPlaying: true, currentTime: 0 }));
  };

  const handleAddTrackToPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id === playlistId) {
          if (p.trackIds.includes(trackId)) return p;
          return { ...p, trackIds: [...p.trackIds, trackId] };
        }
        return p;
      })
    );
  };

  const handleRemoveTrackFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id === playlistId) {
          return { ...p, trackIds: p.trackIds.filter((id) => id !== trackId) };
        }
        return p;
      })
    );
  };

  const handleSelectPlaylistToPlay = (playlistId: string, startTrackIndex = 0) => {
    setActivePlaylistId(playlistId);
    setCurrentTrackIndex(startTrackIndex);
    setPlayerState((prev) => ({ ...prev, isPlaying: true, currentTime: 0 }));
  };

  const handlePlayAllTracks = () => {
    setActivePlaylistId(null);
    setCurrentTrackIndex(0);
    setPlayerState((prev) => ({ ...prev, isPlaying: true, currentTime: 0 }));
  };

  const progressFraction =
    playerState.duration > 0 ? playerState.currentTime / playerState.duration : 0;

  const currentDisplayNumber = activePlaylist
    ? `PISTA ${(safeIndex + 1).toString().padStart(2, '0')}/${playableTracks.length.toString().padStart(2, '0')}`
    : `${currentTrack.trackNumber} • SIDE ${currentTrack.side}`;

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Top Deck Status Bar */}
      <Header
        isPlaying={playerState.isPlaying}
        activeTrackNumber={currentDisplayNumber}
        activePlaylistName={activePlaylist ? activePlaylist.name : null}
        playlistCount={playlists.length}
        onOpenPlaylists={() => setIsSlidingDrawerOpen(true)}
      />

      {/* Track Swipe HUD Alert */}
      {trackSwipeToast && (
        <div className="fixed top-14 right-6 sm:right-12 z-50 pointer-events-none animate-in fade-in zoom-in-95">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/95 border border-amber-500/80 text-amber-300 font-mono text-xs font-bold shadow-[0_10px_35px_rgba(245,158,11,0.35)] backdrop-blur-md">
            <span>{trackSwipeToast.type === 'next' ? '⏩' : '⏪'}</span>
            <span>{trackSwipeToast.title}</span>
          </div>
        </div>
      )}

      {/* Recording Alert Banner / REC Toast */}
      {recToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 animate-bounce transition-all">
          <div className="flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-full bg-red-950/95 border-2 border-red-500 text-white font-mono text-xs sm:text-sm font-bold shadow-[0_10px_30px_rgba(239,68,68,0.4)] backdrop-blur-md">
            <span className="relative flex h-3 w-3 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span>{recToast}</span>
          </div>
        </div>
      )}

      {/* Mobile Orientation Hint (Only visible on small screens in portrait mode) */}
      <div className="portrait:flex landscape:hidden sm:hidden items-center justify-center gap-2 px-3 py-1 bg-amber-500/10 border-b border-amber-500/25 text-amber-300 font-mono text-[11px] shrink-0 text-center">
        <span className="text-sm">🔄</span>
        <span>Gira tu móvil a modo horizontal para la vista apaisada</span>
      </div>

      {/* Main Container in Landscape Screen (Side-by-Side in Horizontal Mobile & Desktop) */}
      <main className="flex-1 flex flex-col landscape:flex-row md:flex-row min-h-0 w-full max-w-7xl mx-auto p-1 sm:p-2.5 landscape:p-1.5 gap-2 landscape:gap-2.5 overflow-hidden">
        {/* PARTE 1 DE LA PANTALLA: Multimedia Screen Descriptor (Video, Cover, Letra, Exportar a PDF) */}
        <section
          id="screen-part-1"
          aria-label="Pantalla Multimedia y Descriptor"
          className={`flex-1 min-h-0 w-full landscape:w-1/2 md:w-1/2 flex flex-col transition-all duration-700 rounded-2xl ${
            playerState.isPlaying
              ? 'ring-1 ring-amber-500/25 shadow-[0_0_35px_rgba(245,158,11,0.15)]'
              : ''
          }`}
        >
          <ScreenDescriptor
            track={currentTrack}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isPlaying={playerState.isPlaying}
            onTogglePlay={handleTogglePlay}
            currentTime={playerState.currentTime}
            duration={playerState.duration}
            onSeek={handleSeek}
            onUpdateTrackLyrics={handleUpdateTrackLyrics}
            onUpdateTrackCover={handleUpdateTrackCover}
            playlists={playlists}
            activePlaylistName={activePlaylist ? activePlaylist.name : null}
            onOpenPlaylists={() => setIsSlidingDrawerOpen(true)}
            onAddCurrentTrackToPlaylist={(playlistId) =>
              handleAddTrackToPlaylist(playlistId, currentTrack.id)
            }
          />
        </section>

        {/* PARTE 2 DE LA PANTALLA: Hi-Fi Audio Console & Player Controls Deck */}
        <section
          ref={consoleSectionRef}
          id="screen-part-2"
          aria-label="Consola de Audio Hi-Fi y Controles del Reproductor"
          className="flex-1 min-h-0 w-full landscape:w-1/2 md:w-1/2 flex flex-col justify-between items-center gap-1 sm:gap-2 p-1.5 sm:p-3 bg-gradient-to-b from-zinc-900/80 to-zinc-950/90 rounded-2xl border border-zinc-800/90 shadow-2xl backdrop-blur-md overflow-hidden touch-pan-y"
        >
          {/* Deck Header Bar */}
          <div className="w-full flex items-center justify-between px-2 text-[10px] sm:text-[11px] font-mono text-zinc-400 border-b border-zinc-800/80 pb-1 shrink-0">
            <span className="flex items-center gap-1.5 font-bold tracking-wider text-amber-400/90">
              <span className={`w-2 h-2 rounded-full ${playerState.isPlaying ? 'bg-amber-400 animate-pulse' : 'bg-zinc-500'}`} />
              HI-FI AUDIO CONSOLE
            </span>
            <div className="flex items-center gap-2">
              <span className="hidden xl:inline text-[9px] px-1.5 py-0.5 rounded bg-zinc-800/70 text-zinc-400 border border-zinc-700/50">
                ⇄ Desliza para cambiar pista
              </span>
              <span className="text-zinc-500 font-semibold truncate max-w-[130px] sm:max-w-[170px]">
                {activePlaylist ? `MIXTAPE: ${activePlaylist.name.toUpperCase()}` : 'FULL LIBRARY'}
              </span>
            </div>
          </div>

          {/* Hi-Fi Audio Console (Dual VU Meters & RTA Spectrum Analyzer) */}
          <div className="w-full flex-1 min-h-0 flex items-center justify-center overflow-hidden">
            <HiFiConsole
              track={currentTrack}
              isPlaying={playerState.isPlaying}
              activePlaylistName={activePlaylist ? activePlaylist.name : null}
              isRecordingFeedback={isRecordingFeedback}
            />
          </div>

          {/* Mechanical Player Controls with Vintage REC button */}
          <div className="w-full shrink-0 pt-0.5">
            <PlayerControls
              track={currentTrack}
              playerState={playerState}
              onTogglePlay={handleTogglePlay}
              onStop={handleStop}
              onNextTrack={handleNextTrack}
              onPrevTrack={handlePrevTrack}
              onSeek={handleSeek}
              onRewind10={handleRewind10}
              onForward10={handleForward10}
              onToggleMute={handleToggleMute}
              onVolumeChange={handleVolumeChange}
              onToggleLoop={handleToggleLoop}
              onRecordTrack={handleRecordTrack}
              isRecordingFeedback={isRecordingFeedback}
            />
          </div>
        </section>
      </main>

      {/* Floating Search Action & Drawer */}
      <FloatingSearch
        tracks={tracks}
        currentTrackId={currentTrack.id}
        playlists={playlists}
        onSelectTrack={handleSelectTrack}
        onAddCustomTrack={handleAddCustomTrack}
        onAddTrackToPlaylist={handleAddTrackToPlaylist}
        onOpenPlaylists={() => setIsSlidingDrawerOpen(true)}
      />

      {/* Dynamic Sliding Playlist Drawer (Gesture-driven side panel) */}
      <SlidingPlaylistDrawer
        isOpen={isSlidingDrawerOpen}
        onOpen={() => setIsSlidingDrawerOpen(true)}
        onClose={() => setIsSlidingDrawerOpen(false)}
        playlists={playlists}
        activePlaylistId={activePlaylistId}
        allTracks={tracks}
        currentTrackId={currentTrack.id}
        onSelectPlaylistToPlay={(playlistId, startIdx) => {
          handleSelectPlaylistToPlay(playlistId, startIdx);
          setIsSlidingDrawerOpen(false);
        }}
        onOpenFullModal={() => setIsPlaylistModalOpen(true)}
        onCreatePlaylist={handleCreatePlaylist}
      />

      {/* Complete Playlist Manager Modal (Full editing & export/import) */}
      <PlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        playlists={playlists}
        activePlaylistId={activePlaylistId}
        allTracks={tracks}
        onSelectPlaylistToPlay={(playlistId, startIdx) => {
          handleSelectPlaylistToPlay(playlistId, startIdx);
          setIsPlaylistModalOpen(false);
        }}
        onPlayAllTracks={() => {
          handlePlayAllTracks();
          setIsPlaylistModalOpen(false);
        }}
        onCreatePlaylist={handleCreatePlaylist}
        onRenamePlaylist={handleRenamePlaylist}
        onDeletePlaylist={handleDeletePlaylist}
        onAddTrackToPlaylist={handleAddTrackToPlaylist}
        onRemoveTrackFromPlaylist={handleRemoveTrackFromPlaylist}
        currentTrackId={currentTrack.id}
        onAddNewYouTubeTrack={handleAddCustomTrack}
        onImportPlaylist={handleImportPlaylist}
      />
    </div>
  );
}

