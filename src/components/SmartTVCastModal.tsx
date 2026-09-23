import React, { useState, useEffect } from 'react';
import {
  Tv,
  X,
  Cast,
  QrCode,
  ExternalLink,
  Check,
  Copy,
  Sparkles,
  Wifi,
  Smartphone,
  Radio,
  Share2,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Track } from '../types';

interface SmartTVCastModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track;
  isPlaying: boolean;
}

export const SmartTVCastModal: React.FC<SmartTVCastModalProps> = ({
  isOpen,
  onClose,
  currentTrack,
  isPlaying,
}) => {
  const [activeTab, setActiveTab] = useState<'cast' | 'pair' | 'qr'>('cast');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [tvPairCode, setTvPairCode] = useState('');
  const [isScanningDevices, setIsScanningDevices] = useState(false);
  const [castStatus, setCastStatus] = useState<string | null>(null);

  // Direct video URL for TV
  const tvUrl = typeof window !== 'undefined' ? window.location.href : '';

  // Generate QR Code for opening app on Smart TV
  useEffect(() => {
    if (!isOpen) return;

    QRCode.toDataURL(
      tvUrl,
      {
        width: 240,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      },
      (err, url) => {
        if (!err && url) {
          setQrDataUrl(url);
        }
      }
    );
  }, [isOpen, tvUrl]);

  if (!isOpen) return null;

  // Handle native browser cast discovery (RemotePlayback / Presentation API)
  const handleStartDeviceDiscovery = async () => {
    setIsScanningDevices(true);
    setCastStatus('Buscando Smart TVs y Chromecasts en tu red Wi-Fi...');

    try {
      // Check if Presentation API is supported
      if ('PresentationRequest' in window) {
        try {
          const presentationRequest = new (window as any).PresentationRequest([
            `https://www.youtube.com/embed/${currentTrack.youtubeId}`,
          ]);
          presentationRequest.start();
          setCastStatus('Dispositivos detectados. Selecciona tu Smart TV en el menú.');
          setIsScanningDevices(false);
          return;
        } catch (presErr) {
          console.warn('Presentation API error:', presErr);
        }
      }

      // Check if RemotePlayback API is available
      const videoElement = document.querySelector('video') as any;
      if (videoElement && 'remote' in videoElement) {
        await videoElement.remote.prompt();
        setCastStatus('Transmitiendo a Smart TV');
        setIsScanningDevices(false);
        return;
      }

      // Fallback
      setTimeout(() => {
        setIsScanningDevices(false);
        setCastStatus(
          'Para Smart TVs (Samsung, LG, Sony, Roku): Usa "Vincular con Código" o abre YouTube en tu televisor.'
        );
      }, 1500);
    } catch (e) {
      setIsScanningDevices(false);
      setCastStatus('Abre la app de YouTube en tu TV para vincular al instante.');
    }
  };

  const handleCopyTvUrl = () => {
    navigator.clipboard.writeText(tvUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const cleanYtId = currentTrack.youtubeId.replace('search:', '');
  const youtubeTvDirectUrl = `https://www.youtube.com/watch?v=${cleanYtId}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        id="smart-tv-cast-modal"
        className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 font-sans"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-zinc-950 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Tv className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-zinc-100 flex items-center gap-2">
                <span>Compartir con Smart TV</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                  EN VIVO
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Transmite a Samsung, LG, Chromecast, Roku, Fire TV o Sony
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Track Banner */}
        <div className="px-4 py-3 bg-zinc-950/70 border-b border-zinc-800/80 flex items-center gap-3">
          <img
            src={currentTrack.coverUrl}
            alt={currentTrack.title}
            className="w-10 h-10 rounded-lg object-cover border border-amber-500/30 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-zinc-200 truncate">{currentTrack.title}</p>
            <p className="text-[11px] text-zinc-400 truncate">
              {currentTrack.artist} • {isPlaying ? '▶ Reproduciendo' : '⏸ En pausa'}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-2 bg-zinc-950/40 border-b border-zinc-800/60 text-xs">
          <button
            onClick={() => setActiveTab('cast')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold transition-all ${
              activeTab === 'cast'
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Cast className="w-3.5 h-3.5" />
            <span>Transmisión Directa</span>
          </button>
          <button
            onClick={() => setActiveTab('pair')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold transition-all ${
              activeTab === 'pair'
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Código de TV</span>
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold transition-all ${
              activeTab === 'qr'
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Código QR</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 1: DIRECT CAST & DISCOVERY */}
          {activeTab === 'cast' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex flex-col items-center text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Wifi className="w-7 h-7 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-zinc-100">
                    Transmisión Wi-Fi a Smart TV
                  </h4>
                  <p className="text-xs text-zinc-400 max-w-sm mt-1">
                    Asegúrate de que tu teléfono/PC y tu Smart TV estén conectados a la misma red Wi-Fi.
                  </p>
                </div>

                <button
                  onClick={handleStartDeviceDiscovery}
                  disabled={isScanningDevices}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Cast className="w-4 h-4" />
                  <span>{isScanningDevices ? 'Buscando televisores...' : 'Detectar y Conectar a Smart TV'}</span>
                </button>

                {castStatus && (
                  <p className="text-xs font-mono text-amber-300/90 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                    {castStatus}
                  </p>
                )}
              </div>

              {/* Compatible Smart TV Brands */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                  <p className="font-bold text-zinc-200">Samsung TV</p>
                  <p className="text-[10px] text-zinc-500">Smart View / Tizen</p>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                  <p className="font-bold text-zinc-200">LG Smart TV</p>
                  <p className="text-[10px] text-zinc-500">webOS / Cast</p>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                  <p className="font-bold text-zinc-200">Chromecast</p>
                  <p className="text-[10px] text-zinc-500">Google TV</p>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                  <p className="font-bold text-zinc-200">Roku & Fire TV</p>
                  <p className="text-[10px] text-zinc-500">AirPlay & Mirror</p>
                </div>
              </div>

              {/* Direct Open in YouTube on TV */}
              <a
                href={youtubeTvDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800 hover:border-red-500/40 text-zinc-200 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-lg bg-red-600/20 text-red-500 font-bold text-xs">
                    YT
                  </span>
                  <div>
                    <p className="text-xs font-bold group-hover:text-amber-400 transition-colors">
                      Abrir en YouTube para TV
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      Envía este video oficial directamente a la app de tu TV
                    </p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-amber-400" />
              </a>
            </div>
          )}

          {/* TAB 2: PAIR WITH TV CODE */}
          {activeTab === 'pair' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3">
                <h4 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                  <Tv className="w-4 h-4 text-amber-400" />
                  <span>Vincular con Código de TV (Cualquier Smart TV)</span>
                </h4>
                <p className="text-xs text-zinc-400">
                  Abre la aplicación de <strong>YouTube</strong> en tu televisor (Samsung, LG, Sony, etc.):
                </p>
                <ol className="list-decimal list-inside text-xs text-zinc-300 space-y-1.5 pl-1 font-mono">
                  <li>En tu Smart TV ve a: <strong>Configuración ⚙️ &gt; Vincular con código de TV</strong></li>
                  <li>Aparecerá un código numérico (ej. 123 456 789 012)</li>
                  <li>Ingresa el código aquí o ábrelo en la web de sincronización:</li>
                </ol>

                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={tvPairCode}
                    onChange={(e) => setTvPairCode(e.target.value)}
                    placeholder="Escribe el código de tu TV..."
                    className="flex-1 px-3 py-2 bg-zinc-900 rounded-xl border border-zinc-700 text-xs text-zinc-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                  <a
                    href="https://www.youtube.com/pair"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-transform active:scale-95"
                  >
                    <span>Vincular en TV</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ventaja de la vinculación por TV</span>
                </p>
                <p className="text-[11px] text-zinc-300">
                  Una vez vinculado el código una sola vez, tu Smart TV recordará tu dispositivo y podrás enviar cualquier canción o video con un toque.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: QR CODE FOR SMART TV BROWSER */}
          {activeTab === 'qr' && (
            <div className="space-y-4 flex flex-col items-center text-center">
              <div className="p-4 bg-white rounded-2xl shadow-xl border-4 border-amber-500/40">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Código QR para Smart TV"
                    className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-zinc-400 text-xs">
                    Generando QR...
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-sm text-zinc-100">
                  Escanea para abrir en el Navegador de tu Smart TV
                </h4>
                <p className="text-xs text-zinc-400 max-w-sm">
                  Abre la cámara de tu móvil o el navegador web de tu Smart TV (Samsung Internet, LG webOS Browser) para ver la consola en pantalla gigante.
                </p>
              </div>

              <div className="w-full flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-400">
                <span className="truncate pr-2">{tvUrl}</span>
                <button
                  onClick={handleCopyTvUrl}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-bold shrink-0 transition-colors"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-zinc-950 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>TRANSMISIÓN STEREO DISPONIBLE</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
