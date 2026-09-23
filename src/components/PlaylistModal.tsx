import React, { useState, useRef } from 'react';
import {
  ListMusic,
  Plus,
  Play,
  Trash2,
  Edit2,
  Check,
  X,
  Music,
  Clock,
  Disc3,
  Sparkles,
  ArrowRight,
  FolderPlus,
  Radio,
  ExternalLink,
  Download,
  Upload,
  FileJson,
} from 'lucide-react';
import { Playlist, Track } from '../types';
import { exportPlaylistToJson, parseImportedPlaylistJson } from '../utils/playlistIO';

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  activePlaylistId: string | null;
  allTracks: Track[];
  onSelectPlaylistToPlay: (playlistId: string, startTrackIndex?: number) => void;
  onPlayAllTracks: () => void; // return to all master tracks
  onCreatePlaylist: (name: string, description?: string, color?: string) => string;
  onRenamePlaylist: (id: string, newName: string, newDescription?: string) => void;
  onDeletePlaylist: (id: string) => void;
  onAddTrackToPlaylist: (playlistId: string, trackId: string) => void;
  onRemoveTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  currentTrackId?: string;
  onAddNewYouTubeTrack?: (newTrack: Track, targetPlaylistId?: string) => void;
  onImportPlaylist?: (importedData: { playlistName: string; description?: string; newTracks: Track[] }) => void;
}

const COLOR_OPTIONS = [
  { id: 'amber', label: 'Ámbar Vintage', bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/40' },
  { id: 'cyan', label: 'Neón Cian', bg: 'bg-cyan-500', text: 'text-cyan-400', border: 'border-cyan-500/40' },
  { id: 'emerald', label: 'Verde Cromo', bg: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/40' },
  { id: 'rose', label: 'Rubí Retro', bg: 'bg-rose-500', text: 'text-rose-400', border: 'border-rose-500/40' },
  { id: 'purple', label: 'Violeta Synth', bg: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-500/40' },
];

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  isOpen,
  onClose,
  playlists,
  activePlaylistId,
  allTracks,
  onSelectPlaylistToPlay,
  onPlayAllTracks,
  onCreatePlaylist,
  onRenamePlaylist,
  onDeletePlaylist,
  onAddTrackToPlaylist,
  onRemoveTrackFromPlaylist,
  currentTrackId,
  onAddNewYouTubeTrack,
  onImportPlaylist,
}) => {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(
    activePlaylistId || (playlists[0]?.id ?? null)
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Create playlist form
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [newPlaylistColor, setNewPlaylistColor] = useState('amber');

  // Edit playlist form
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Add tracks selector modal within playlist view
  const [showAddTrackPicker, setShowAddTrackPicker] = useState(false);
  const [trackSearchQuery, setTrackSearchQuery] = useState('');

  if (!isOpen) return null;

  const currentSelectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId) || playlists[0];

  // Helper to get tracks of selected playlist
  const getPlaylistTracks = (playlist: Playlist): Track[] => {
    return playlist.trackIds
      .map((id) => allTracks.find((t) => t.id === id))
      .filter((t): t is Track => t !== undefined);
  };

  const selectedPlaylistTracks = currentSelectedPlaylist
    ? getPlaylistTracks(currentSelectedPlaylist)
    : [];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    const createdId = onCreatePlaylist(newPlaylistName.trim(), newPlaylistDesc.trim(), newPlaylistColor);
    setSelectedPlaylistId(createdId);
    setNewPlaylistName('');
    setNewPlaylistDesc('');
    setIsCreating(false);
  };

  const startEditing = (p: Playlist) => {
    setEditingPlaylistId(p.id);
    setEditName(p.name);
    setEditDesc(p.description || '');
  };

  const saveEditing = () => {
    if (editingPlaylistId && editName.trim()) {
      onRenamePlaylist(editingPlaylistId, editName.trim(), editDesc.trim());
    }
    setEditingPlaylistId(null);
  };

  const formatTotalTime = (tracks: Track[]) => {
    const totalSecs = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const tracksAvailableToAdd = allTracks.filter(
    (t) =>
      currentSelectedPlaylist &&
      !currentSelectedPlaylist.trackIds.includes(t.id) &&
      (t.title.toLowerCase().includes(trackSearchQuery.toLowerCase()) ||
        t.artist.toLowerCase().includes(trackSearchQuery.toLowerCase()))
  );

  const handleExportCurrentPlaylist = () => {
    if (!currentSelectedPlaylist) return;
    try {
      exportPlaylistToJson(currentSelectedPlaylist, allTracks);
      setToastMessage(`Lista "${currentSelectedPlaylist.name}" exportada con éxito (.json)`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      alert(`Error al exportar lista: ${err.message || err}`);
    }
  };

  const handleTriggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseImportedPlaylistJson(text);
      if (onImportPlaylist) {
        onImportPlaylist(parsed);
      }
      setToastMessage(
        `¡Lista "${parsed.playlistName}" importada con éxito! (${parsed.newTracks.length} canciones añadidas)`
      );
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert(`Error al importar lista: ${err.message || err}`);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        id="playlist-manager-modal"
        className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh] max-h-[720px] animate-in zoom-in-95 duration-200"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-zinc-950 border-b border-zinc-800 select-none">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ListMusic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-zinc-100 flex items-center gap-2">
                <span>Mis Listas de Reproducción (Mixtapes)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-amber-400 border border-zinc-700">
                  {playlists.length} Listas
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Organiza tus videos favoritos, expórtalos e importa listas compatibles
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Import Button in Header */}
            <button
              onClick={handleTriggerFileInput}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-amber-400 border border-zinc-700 text-xs font-bold transition-all shadow-sm"
              title="Importar lista de reproducción desde archivo .json compatible (MixCasete)"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Importar Lista</span>
              <span className="text-[10px] font-mono px-1 py-0.2 bg-zinc-900 rounded text-zinc-400">.JSON</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hidden File Input for JSON Import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Toast Notification */}
        {toastMessage && (
          <div className="bg-emerald-600/95 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-lg animate-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-white/80 hover:text-white text-xs"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Master Queue Mode Status Switch */}
        <div className="px-4 sm:px-6 py-2 bg-zinc-950/60 border-b border-zinc-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Cola activa:</span>
            {activePlaylistId ? (
              <span className="flex items-center gap-1.5 font-semibold text-amber-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {playlists.find((p) => p.id === activePlaylistId)?.name || 'Lista personalizada'}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-semibold text-zinc-300 font-mono">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                Master Cassette (Todas las canciones)
              </span>
            )}
          </div>

          {activePlaylistId && (
            <button
              onClick={onPlayAllTracks}
              className="text-xs text-zinc-400 hover:text-amber-400 underline font-medium"
            >
              Volver a reproducir todo el repertorio
            </button>
          )}
        </div>

        {/* Main 2-Column Split: Left Side Playlists Navigation, Right Side Playlist Track Content */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Column: Playlists List & Creator */}
          <div className="w-full md:w-72 bg-zinc-950/50 border-r border-zinc-800/80 flex flex-col shrink-0">
            <div className="p-3 border-b border-zinc-800/60 flex items-center justify-between gap-1">
              <span className="text-xs font-mono font-bold uppercase text-zinc-400 tracking-wider truncate">
                Colección
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleTriggerFileInput}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-amber-400 font-medium text-xs transition-colors border border-zinc-700/60"
                  title="Importar lista (.json)"
                >
                  <Upload className="w-3 h-3 text-amber-400" />
                  <span>Importar</span>
                </button>
                <button
                  onClick={() => setIsCreating(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors"
                  title="Crear nueva lista de reproducción"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nueva</span>
                </button>
              </div>
            </div>

            {/* Create Playlist Form Drawer */}
            {isCreating && (
              <form
                onSubmit={handleCreateSubmit}
                className="p-3 bg-zinc-900 border-b border-zinc-800 space-y-2.5 animate-in slide-in-from-top-2 duration-150"
              >
                <div className="flex items-center justify-between text-xs font-bold text-zinc-200">
                  <span>Nombrar nueva lista</span>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="Ej. Lo Mejor del Rock Latino"
                  className="w-full px-2.5 py-1.5 bg-zinc-950 rounded-lg border border-zinc-700 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
                  autoFocus
                  required
                />
                <input
                  type="text"
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  placeholder="Descripción (opcional)"
                  className="w-full px-2.5 py-1.5 bg-zinc-950 rounded-lg border border-zinc-700 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
                />

                {/* Color accents */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-zinc-400 mr-1 font-mono">Color:</span>
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setNewPlaylistColor(c.id)}
                      className={`w-4 h-4 rounded-full ${c.bg} transition-transform ${
                        newPlaylistColor === c.id ? 'scale-125 ring-2 ring-white' : 'opacity-60 hover:opacity-100'
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>

                <div className="flex justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-400 text-xs hover:bg-zinc-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 rounded bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400"
                  >
                    Crear Lista
                  </button>
                </div>
              </form>
            )}

            {/* Playlists Scrollable List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {playlists.map((playlist) => {
                const isSelected = playlist.id === selectedPlaylistId;
                const isCurrentlyPlaying = playlist.id === activePlaylistId;
                const trackCount = playlist.trackIds.length;

                return (
                  <div
                    key={playlist.id}
                    onClick={() => setSelectedPlaylistId(playlist.id)}
                    className={`group relative p-2.5 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-zinc-800/90 border-amber-500/60 shadow-md'
                        : 'bg-zinc-900/40 hover:bg-zinc-800/50 border-zinc-800/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              playlist.color === 'cyan'
                                ? 'bg-cyan-400'
                                : playlist.color === 'emerald'
                                ? 'bg-emerald-400'
                                : playlist.color === 'rose'
                                ? 'bg-rose-400'
                                : playlist.color === 'purple'
                                ? 'bg-purple-400'
                                : 'bg-amber-400'
                            }`}
                          />
                          <h4 className="font-semibold text-xs text-zinc-200 truncate">
                            {playlist.name}
                          </h4>
                        </div>
                        {playlist.description && (
                          <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                            {playlist.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-zinc-400">
                          <span>{trackCount} video{trackCount !== 1 ? 's' : ''}</span>
                          {isCurrentlyPlaying && (
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              • EN REPRODUCCIÓN
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Play Action */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPlaylistToPlay(playlist.id, 0);
                        }}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-300 transition-colors shrink-0"
                        title="Reproducir esta lista en secuencia"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Playlist Details & Track Management */}
          {currentSelectedPlaylist ? (
            <div className="flex-1 flex flex-col min-h-0 bg-zinc-900/60">
              {/* Selected Playlist Toolbar */}
              <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950/40">
                {editingPlaylistId === currentSelectedPlaylist.id ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Nombre de la lista"
                        className="flex-1 px-3 py-1.5 bg-zinc-900 rounded-lg border border-amber-500 text-sm text-zinc-100 font-bold"
                        autoFocus
                      />
                      <button
                        onClick={saveEditing}
                        className="p-2 rounded-lg bg-amber-500 text-zinc-950 font-bold hover:bg-amber-400"
                        title="Guardar nombre"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingPlaylistId(null)}
                        className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                        title="Cancelar edición"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="Descripción de la lista (opcional)"
                      className="w-full px-3 py-1 bg-zinc-900 rounded-lg border border-zinc-700 text-xs text-zinc-300"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-zinc-100">
                          {currentSelectedPlaylist.name}
                        </h3>
                        <button
                          onClick={() => startEditing(currentSelectedPlaylist)}
                          className="p-1 text-zinc-500 hover:text-amber-400 transition-colors"
                          title="Cambiar nombre de la lista"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {currentSelectedPlaylist.description || 'Sin descripción'} •{' '}
                        {selectedPlaylistTracks.length} video(s) •{' '}
                        {formatTotalTime(selectedPlaylistTracks)}
                      </p>
                    </div>

                    {/* Playlist Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        id="btn-play-playlist-sequence"
                        onClick={() => onSelectPlaylistToPlay(currentSelectedPlaylist.id, 0)}
                        disabled={selectedPlaylistTracks.length === 0}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Reproducir en Secuencia</span>
                      </button>

                      <button
                        onClick={() => setShowAddTrackPicker(true)}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-400" />
                        <span>Añadir Video</span>
                      </button>

                      {/* Export Playlist Button */}
                      <button
                        id="btn-export-playlist-json"
                        onClick={handleExportCurrentPlaylist}
                        disabled={selectedPlaylistTracks.length === 0}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 hover:text-amber-300 disabled:opacity-40 text-xs font-semibold transition-colors border border-zinc-700"
                        title="Exportar esta lista en formato compatible MixCasete (.json)"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Exportar</span>
                        <span className="text-[10px] font-mono opacity-80">.JSON</span>
                      </button>

                      {playlists.length > 1 && (
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `¿Seguro que deseas eliminar la lista "${currentSelectedPlaylist.name}"? Los videos seguirán disponibles en el repertorio general.`
                              )
                            ) {
                              onDeletePlaylist(currentSelectedPlaylist.id);
                              setSelectedPlaylistId(
                                playlists.find((p) => p.id !== currentSelectedPlaylist.id)?.id || null
                              );
                            }
                          }}
                          className="p-2 rounded-xl bg-zinc-800/80 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors"
                          title="Eliminar esta lista"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Add Track Selector Dropdown Overlay */}
              {showAddTrackPicker && (
                <div className="p-3 bg-zinc-950 border-b border-zinc-800 space-y-2 animate-in slide-in-from-top duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200">
                      Selecciona videos para añadir a &quot;{currentSelectedPlaylist.name}&quot;
                    </span>
                    <button
                      onClick={() => setShowAddTrackPicker(false)}
                      className="p-1 text-zinc-400 hover:text-zinc-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={trackSearchQuery}
                    onChange={(e) => setTrackSearchQuery(e.target.value)}
                    placeholder="Filtrar por título o artista..."
                    className="w-full px-3 py-1.5 bg-zinc-900 rounded-lg border border-zinc-700 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
                  />

                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                    {tracksAvailableToAdd.length === 0 ? (
                      <p className="text-xs text-zinc-500 py-3 text-center">
                        Todos los temas disponibles ya están en esta lista o no hay coincidencias.
                      </p>
                    ) : (
                      tracksAvailableToAdd.map((track) => (
                        <div
                          key={track.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800/80 text-xs border border-zinc-800"
                        >
                          <div className="flex items-center gap-2.5 truncate pr-2">
                            <img
                              src={track.coverUrl}
                              alt={track.title}
                              className="w-7 h-7 rounded object-cover shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="truncate">
                              <span className="font-semibold text-zinc-200 truncate block">
                                {track.title}
                              </span>
                              <span className="text-zinc-400 text-[10px] truncate block">
                                {track.artist}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              onAddTrackToPlaylist(currentSelectedPlaylist.id, track.id);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-[11px] shrink-0"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Añadir</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tracks in Current Playlist */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {selectedPlaylistTracks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center text-zinc-500">
                    <Music className="w-12 h-12 stroke-1 text-zinc-600 mb-2" />
                    <p className="font-semibold text-zinc-400 text-sm">
                      Esta lista está vacía
                    </p>
                    <p className="text-xs text-zinc-500 max-w-sm mt-1">
                      Haz clic en &quot;Añadir Video&quot; arriba o navega por los videos y añádelos a esta lista con el botón &quot;+ Lista&quot;.
                    </p>
                    <button
                      onClick={() => setShowAddTrackPicker(true)}
                      className="mt-4 px-3 py-1.5 rounded-lg bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400"
                    >
                      Añadir el primer video
                    </button>
                  </div>
                ) : (
                  selectedPlaylistTracks.map((track, index) => {
                    const isPlayingCurrent =
                      activePlaylistId === currentSelectedPlaylist.id &&
                      track.id === currentTrackId;

                    return (
                      <div
                        key={`${track.id}-${index}`}
                        className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all ${
                          isPlayingCurrent
                            ? 'bg-amber-500/15 border-amber-500/50 shadow-md text-amber-400'
                            : 'bg-zinc-950/70 hover:bg-zinc-800/60 border-zinc-800/80 text-zinc-300'
                        }`}
                      >
                        {/* Order & Track Info */}
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <span className="font-mono text-xs font-bold text-zinc-500 w-5 text-center shrink-0">
                            {(index + 1).toString().padStart(2, '0')}
                          </span>

                          <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-zinc-700 bg-zinc-900">
                            <img
                              src={track.coverUrl}
                              alt={track.title}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            {isPlayingCurrent && (
                              <div className="absolute inset-0 bg-amber-500/40 flex items-center justify-center">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                              </div>
                            )}
                          </div>

                          <div className="truncate">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-zinc-100 truncate">
                                {track.title}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                                {track.trackNumber}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 truncate">
                              {track.artist} • {track.album}
                            </p>
                          </div>
                        </div>

                        {/* Actions: Play from here in sequence, or remove from playlist */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-mono text-zinc-500 hidden sm:inline">
                            {Math.floor(track.duration / 60)}:
                            {(track.duration % 60).toString().padStart(2, '0')}
                          </span>

                          <button
                            onClick={() => {
                              onSelectPlaylistToPlay(currentSelectedPlaylist.id, index);
                            }}
                            className={`p-2 rounded-xl transition-all ${
                              isPlayingCurrent
                                ? 'bg-amber-500 text-zinc-950 font-bold'
                                : 'bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-300'
                            }`}
                            title="Reproducir este video y continuar en secuencia"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>

                          <button
                            onClick={() => {
                              onRemoveTrackFromPlaylist(currentSelectedPlaylist.id, track.id);
                            }}
                            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors"
                            title="Eliminar de esta lista"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-zinc-500">
              Selecciona una lista de reproducción a la izquierda o crea una nueva.
            </div>
          )}
        </div>

        {/* Modal Bottom Bar */}
        <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Al reproducir una lista, el cassette continuará automáticamente al siguiente video al terminar cada tema.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
