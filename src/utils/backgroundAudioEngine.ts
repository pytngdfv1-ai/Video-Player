/**
 * Background & Screen-Off Audio Keep-Alive Engine
 * 
 * Uses HTML5 Audio carrier tone and WakeLock API so the audio
 * continues playing uninterrupted when the device screen turns off
 * or when the user switches to other apps.
 */

class BackgroundAudioEngine {
  private audioElement: HTMLAudioElement | null = null;
  private wakeLock: any = null;
  private isAudioUnlocked = false;

  constructor() {
    // Lazy-init on first user gesture
    if (typeof window !== 'undefined') {
      window.addEventListener('click', () => this.unlockAudio(), { once: true });
      window.addEventListener('touchstart', () => this.unlockAudio(), { once: true });
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }
  }

  /**
   * Initializes a tiny inaudible looping audio carrier (WAV format base64)
   * that informs the mobile OS / Android WebView that media playback is active.
   */
  private unlockAudio() {
    if (this.isAudioUnlocked || typeof window === 'undefined') return;

    try {
      // 1-second inaudible PCM WAV encoded in base64
      const silentWavBase64 =
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      
      const audio = new Audio();
      audio.src = silentWavBase64;
      audio.loop = true;
      audio.volume = 0.01; // barely above 0 to prevent OS aggressive power-off suspension
      (audio as any).playsInline = true;
      (audio as any).webkitPlaysInline = true;

      this.audioElement = audio;
      this.isAudioUnlocked = true;
    } catch (e) {
      console.warn('Silent audio carrier setup failed:', e);
    }
  }

  /**
   * Starts the background audio keep-alive carrier and requests screen wake-lock if supported
   */
  public async startKeepAlive(): Promise<void> {
    this.unlockAudio();

    if (this.audioElement) {
      try {
        await this.audioElement.play();
      } catch (e) {
        // Can fail if no prior user interaction
      }
    }

    // Request Wake Lock if supported and visible
    if ('wakeLock' in navigator && !this.wakeLock && !document.hidden) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
        });
      } catch (e) {
        // WakeLock request failed (e.g. low battery mode)
      }
    }
  }

  /**
   * Stops the keep-alive carrier when paused
   */
  public stopKeepAlive(): void {
    if (this.audioElement) {
      try {
        this.audioElement.pause();
      } catch (e) {}
    }

    if (this.wakeLock) {
      try {
        this.wakeLock.release();
        this.wakeLock = null;
      } catch (e) {}
    }
  }

  /**
   * Handles app switching to background or screen locking
   */
  private async handleVisibilityChange(): Promise<void> {
    if (document.hidden) {
      // Re-affirm audio carrier playback when hidden to avoid Android throttle
      if (this.audioElement && this.isAudioUnlocked) {
        try {
          await this.audioElement.play();
        } catch (e) {}
      }
    } else {
      // When returning to foreground, re-acquire wakelock if previously playing
      if (this.audioElement && !this.audioElement.paused && 'wakeLock' in navigator && !this.wakeLock) {
        try {
          this.wakeLock = await (navigator as any).wakeLock.request('screen');
        } catch (e) {}
      }
    }
  }
}

export const backgroundAudioEngine = new BackgroundAudioEngine();
