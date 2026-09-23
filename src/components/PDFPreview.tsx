import React, { useState, useEffect } from 'react';
import {
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  RefreshCw,
  Check,
  Eye,
  Disc3,
  X,
  ExternalLink,
} from 'lucide-react';
import { Track } from '../types';
import { generateTrackPDF } from '../utils/pdfGenerator';
import { SmoothCoverImage } from './SmoothCoverImage';

interface PDFPreviewProps {
  track: Track;
  onDownload: () => void;
  isExporting: boolean;
  pdfDownloaded: boolean;
}

export const PDFPreview: React.FC<PDFPreviewProps> = ({
  track,
  onDownload,
  isExporting,
  pdfDownloaded,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [activeViewMode, setActiveViewMode] = useState<'sheet' | 'livePdf'>('sheet');
  const [livePdfUrl, setLivePdfUrl] = useState<string | null>(null);
  const [isGeneratingBlob, setIsGeneratingBlob] = useState(false);
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false);

  // Clean up any generated blob url on unmount or track change
  useEffect(() => {
    return () => {
      if (livePdfUrl) {
        URL.revokeObjectURL(livePdfUrl);
      }
    };
  }, [livePdfUrl]);

  const handleGenerateLivePdf = async () => {
    setIsGeneratingBlob(true);
    try {
      if (livePdfUrl) {
        URL.revokeObjectURL(livePdfUrl);
      }
      const doc = await generateTrackPDF(track);
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setLivePdfUrl(url);
      setActiveViewMode('livePdf');
    } catch (err) {
      console.error('Error generating live PDF blob:', err);
    } finally {
      setIsGeneratingBlob(false);
    }
  };

  const lyricLines = (track.lyrics || '').split('\n').filter((l) => l.trim().length > 0);
  const half = Math.ceil(lyricLines.length / 2);
  const col1 = lyricLines.slice(0, half);
  const col2 = lyricLines.slice(half);

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 bg-zinc-950/80 rounded-xl border border-zinc-800/80 overflow-hidden shadow-2xl">
      {/* PDF Toolbar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-xs select-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
            <button
              onClick={() => setActiveViewMode('sheet')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                activeViewMode === 'sheet'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Maqueta J-Card</span>
            </button>
            <button
              onClick={() => {
                if (!livePdfUrl) {
                  handleGenerateLivePdf();
                } else {
                  setActiveViewMode('livePdf');
                }
              }}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                activeViewMode === 'livePdf'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {isGeneratingBlob ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
              <span>PDF Renderizado</span>
            </button>
          </div>

          <span className="text-[10px] font-mono text-zinc-500 hidden md:inline">
            Formato A4 • 300 DPI
          </span>
        </div>

        {/* Zoom & Fullscreen Controls */}
        <div className="flex items-center gap-1.5">
          {activeViewMode === 'sheet' && (
            <div className="flex items-center gap-1 bg-zinc-950 px-1 py-0.5 rounded-lg border border-zinc-800 text-[11px] font-mono">
              <button
                onClick={() => setZoomLevel((z) => Math.max(60, z - 15))}
                className="p-1 text-zinc-400 hover:text-amber-400 disabled:opacity-30"
                disabled={zoomLevel <= 60}
                title="Reducir zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="w-10 text-center font-bold text-amber-400">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(140, z + 15))}
                className="p-1 text-zinc-400 hover:text-amber-400 disabled:opacity-30"
                disabled={zoomLevel >= 140}
                title="Aumentar zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={() => setIsFullscreenModalOpen(true)}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-amber-400 transition-colors"
            title="Ver en pantalla completa"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            id="btn-download-pdf-toolbar"
            onClick={onDownload}
            disabled={isExporting}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md active:scale-95 transition-all disabled:opacity-50"
          >
            {isExporting ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : pdfDownloaded ? (
              <Check className="w-3 h-3" />
            ) : (
              <Download className="w-3 h-3" />
            )}
            <span className="hidden sm:inline">{pdfDownloaded ? 'Descargado' : 'Descargar'}</span>
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 overflow-auto p-3 sm:p-6 flex items-start justify-center bg-zinc-950/90 relative">
        {activeViewMode === 'sheet' ? (
          /* Realistic A4 J-Card Document Sheet Mockup */
          <div
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.2s ease',
            }}
            className="w-[520px] bg-[#0e0e11] text-zinc-100 rounded-lg border-2 border-zinc-700/80 shadow-[0_25px_60px_rgba(0,0,0,0.8)] p-6 shrink-0 relative overflow-hidden select-none"
          >
            {/* Top Vintage Gold Bar */}
            <div className="h-2.5 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 -mx-6 -mt-6 mb-5" />

            {/* Document Header */}
            <div className="flex items-center justify-between border-b-2 border-amber-500/40 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Disc3 className="w-6 h-6 text-amber-400 animate-spin-slow" />
                <div>
                  <h4 className="font-oswald text-base font-bold tracking-wider uppercase text-zinc-100">
                    YOUTUBE CASSETTE ARCHIVE
                  </h4>
                  <p className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-semibold">
                    FICHA TÉCNICA OFICIAL & CARÁTULA VINTAGE
                  </p>
                </div>
              </div>
              <div className="text-right font-mono text-[10px] text-zinc-400">
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-amber-300 font-bold">
                  {track.trackNumber}
                </span>
                <p className="mt-1">SIDE {track.side} • STEREO</p>
              </div>
            </div>

            {/* Middle Section: Cover + Technical Specs */}
            <div className="flex gap-4 items-center bg-zinc-900/80 p-3.5 rounded-xl border border-zinc-800 mb-4">
              {/* Cover Art */}
              <div className="w-28 h-28 shrink-0 rounded-lg overflow-hidden border border-amber-500/50 shadow-md">
                <SmoothCoverImage
                  src={track.coverUrl}
                  alt={track.title}
                  aspectRatio="aspect-square"
                  roundedClass="rounded-lg"
                />
              </div>

              {/* Meta information */}
              <div className="flex-1 min-w-0 space-y-1 font-mono text-xs">
                <h3 className="font-bold text-base text-zinc-100 font-sans truncate text-amber-400">
                  {track.title}
                </h3>
                <p className="font-semibold text-zinc-300 text-sm font-sans truncate">
                  {track.artist}
                </p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 text-[11px] text-zinc-400">
                  <div>
                    <span className="text-zinc-500">ÁLBUM:</span> {track.album}
                  </div>
                  <div>
                    <span className="text-zinc-500">AÑO:</span> {track.year}
                  </div>
                  <div>
                    <span className="text-zinc-500">DURACIÓN:</span>{' '}
                    {Math.floor(track.duration / 60)}:
                    {(track.duration % 60).toString().padStart(2, '0')} min
                  </div>
                  <div>
                    <span className="text-zinc-500">GÉNERO:</span> {track.genre}
                  </div>
                </div>
              </div>
            </div>

            {/* Lyrics Section */}
            <div className="border border-zinc-800 rounded-xl p-3.5 bg-zinc-900/40 space-y-2">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
                <span className="text-[11px] font-mono uppercase font-bold text-amber-400">
                  LETRA COMPLETA SINCRONIZADA
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {lyricLines.length} LÍNEAS
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[10px] text-zinc-300 font-mono leading-relaxed max-h-56 overflow-hidden">
                <div className="space-y-1">
                  {col1.slice(0, 18).map((line, idx) => (
                    <p
                      key={idx}
                      className={
                        line.startsWith('[') || line.startsWith('(')
                          ? 'text-amber-400 italic'
                          : 'text-zinc-300'
                      }
                    >
                      {line}
                    </p>
                  ))}
                  {col1.length > 18 && (
                    <p className="text-zinc-500 italic">... [continúa en el documento PDF]</p>
                  )}
                </div>
                <div className="space-y-1">
                  {col2.slice(0, 18).map((line, idx) => (
                    <p
                      key={idx}
                      className={
                        line.startsWith('[') || line.startsWith('(')
                          ? 'text-amber-400 italic'
                          : 'text-zinc-300'
                      }
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* Cassette J-Card Spine Fold Lines Simulation */}
            <div className="mt-4 pt-3 border-t border-dashed border-zinc-700/80 flex items-center justify-between text-[9px] font-mono text-zinc-500">
              <span>✄ LÍNEA DE CORTE Y DOBLADO PARA CAJA DE CASSETTE STANDARD</span>
              <span className="text-amber-500 font-bold">@MixCasete</span>
            </div>
          </div>
        ) : (
          /* Live Real PDF Viewer (Blob IFrame) */
          <div className="w-full h-full flex flex-col items-center justify-center">
            {livePdfUrl ? (
              <iframe
                src={`${livePdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                title="PDF Document Live Preview"
                className="w-full h-full max-w-2xl rounded-xl border border-zinc-800 bg-white shadow-2xl"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-zinc-400">
                <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
                <p className="text-xs font-mono">Renderizando PDF en memoria...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen Modal Preview */}
      {isFullscreenModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between p-2 bg-zinc-900 rounded-t-xl border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-zinc-100 font-mono">
                Vista Previa del PDF: {track.title} ({track.trackNumber})
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onDownload}
                disabled={isExporting}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 text-zinc-950 font-bold text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar</span>
              </button>
              <button
                onClick={() => setIsFullscreenModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 bg-zinc-950 rounded-b-xl overflow-auto p-4 flex items-center justify-center">
            {livePdfUrl ? (
              <iframe
                src={livePdfUrl}
                title="Fullscreen PDF"
                className="w-full h-full max-w-4xl rounded-lg bg-white shadow-2xl border border-zinc-800"
              />
            ) : (
              <div className="max-w-xl w-full bg-[#0e0e11] p-6 rounded-xl border border-zinc-700 text-zinc-100 shadow-2xl">
                {/* Fallback sheet in fullscreen */}
                <div className="flex items-center justify-between border-b border-amber-500 pb-2 mb-4">
                  <h2 className="font-bold text-lg text-amber-400">YOUTUBE CASSETTE ARCHIVE</h2>
                  <span className="font-mono text-xs text-zinc-400">{track.trackNumber}</span>
                </div>
                <div className="flex gap-4 items-center mb-4">
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    className="w-24 h-24 rounded-lg object-cover border border-amber-500"
                  />
                  <div>
                    <h3 className="font-bold text-base">{track.title}</h3>
                    <p className="text-amber-400 text-sm">{track.artist}</p>
                    <p className="text-xs text-zinc-400">{track.album} ({track.year})</p>
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto font-mono text-xs text-zinc-300 space-y-1 bg-zinc-900/80 p-3 rounded">
                  {lyricLines.map((l, i) => (
                    <p key={i}>{l}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
