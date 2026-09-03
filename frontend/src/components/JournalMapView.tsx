import React, { useState, useMemo } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import { JournalEntry } from '../types';
import { formatDate, formatRelativeDate } from '../lib/utils';
import {
  MapPin,
  Sparkles,
  Calendar,
  ExternalLink,
  BookOpen,
  Key,
  Layers,
  Compass,
} from 'lucide-react';

interface JournalMapViewProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onNewEntry: () => void;
}

const DEFAULT_CENTER = { lat: 20.0, lng: 0.0 };

export const JournalMapView: React.FC<JournalMapViewProps> = ({
  entries,
  onSelectEntry,
  onNewEntry,
}) => {
  const envApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';
  const envMapId = (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string) || '';
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('mindreflect_maps_api_key') || envApiKey || '';
  });
  const [mapId, setMapId] = useState<string>(() => {
    return localStorage.getItem('mindreflect_maps_map_id') || envMapId || 'DEMO_MAP_ID';
  });
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [activeMoodFilter, setActiveMoodFilter] = useState<string>('All');
  const [isEditingKey, setIsEditingKey] = useState<boolean>(false);
  const [keyInput, setKeyInput] = useState<string>('');
  const [mapIdInput, setMapIdInput] = useState<string>('');

  const entriesWithLocation = useMemo(() => {
    return entries.filter((e) => e.location && typeof e.location.lat === 'number' && typeof e.location.lng === 'number');
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (activeMoodFilter === 'All') return entriesWithLocation;
    return entriesWithLocation.filter((e) => e.mood === activeMoodFilter);
  }, [entriesWithLocation, activeMoodFilter]);

  const moods = ['All', 'Reflective', 'Grateful', 'Peaceful', 'Energized', 'Challenged', 'Creative'];

  const mapCenter = useMemo(() => {
    if (filteredEntries.length > 0 && filteredEntries[0].location) {
      return { lat: filteredEntries[0].location.lat, lng: filteredEntries[0].location.lng };
    }
    return DEFAULT_CENTER;
  }, [filteredEntries]);

  const handleSaveSettings = () => {
    const trimmedKey = keyInput.trim();
    if (trimmedKey) {
      localStorage.setItem('mindreflect_maps_api_key', trimmedKey);
      setApiKey(trimmedKey);
    }
    const trimmedMapId = mapIdInput.trim();
    if (trimmedMapId) {
      localStorage.setItem('mindreflect_maps_map_id', trimmedMapId);
      setMapId(trimmedMapId);
    } else {
      localStorage.removeItem('mindreflect_maps_map_id');
      setMapId(envMapId || 'DEMO_MAP_ID');
    }
    setIsEditingKey(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Controls */}
      <div
        className="rounded-2xl border p-5 shadow-xs space-y-4"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Compass className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
              <h2 className="font-serif-display text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                Geographic Reflection Map
              </h2>
            </div>
            <p className="text-xs sm:text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Visualizing {entriesWithLocation.length} location-aware reflections across the globe
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => {
                if (!isEditingKey) {
                  setKeyInput(apiKey);
                  setMapIdInput(mapId === 'DEMO_MAP_ID' ? '' : mapId);
                }
                setIsEditingKey(!isEditingKey);
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer"
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            >
              <Key className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
              <span>{apiKey ? 'Maps Configured' : 'Configure Maps Key'}</span>
            </button>

            <button
              onClick={onNewEntry}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span>New Reflection</span>
            </button>
          </div>
        </div>

        {/* API Key & Map ID configuration prompt */}
        {isEditingKey && (
          <div
            className="p-4 rounded-xl border space-y-3"
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center space-x-1.5" style={{ color: 'var(--color-text)' }}>
                <Key className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                <span>Google Maps Platform Configuration</span>
              </span>
              <a
                href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                target="_blank"
                rel="noreferrer"
                className="text-xs flex items-center space-x-1 font-medium hover:underline"
                style={{ color: 'var(--color-accent-text)' }}
              >
                <span>Obtain Free Demo Key</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Set <code className="font-semibold" style={{ color: 'var(--color-accent-text)' }}>VITE_GOOGLE_MAPS_API_KEY</code> in your environment or paste your API key below. For prototyping, the zero-cost Maps Demo Key is supported.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Google Maps API Key
                </label>
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder={apiKey ? '••••••••••••••••••••' : 'Enter Google Maps API key...'}
                  className="w-full border rounded-lg px-3 py-2 text-xs focus:outline-none"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Map ID (Optional Cloud Vector Map ID)
                </label>
                <input
                  type="text"
                  value={mapIdInput}
                  onChange={(e) => setMapIdInput(e.target.value)}
                  placeholder="Optional, defaults to DEMO_MAP_ID"
                  className="w-full border rounded-lg px-3 py-2 text-xs focus:outline-none"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-4 py-2 rounded-lg bg-amber-500 text-neutral-950 text-xs font-bold hover:bg-amber-400 cursor-pointer shadow-xs active:scale-98"
              >
                Save Settings
              </button>
            </div>
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-neutral-800">
          <span className="text-xs font-semibold mr-2 flex items-center space-x-1" style={{ color: 'var(--color-text-muted)' }}>
            <Layers className="w-3.5 h-3.5" />
            <span>Mood:</span>
          </span>
          {moods.map((m) => (
            <button
              key={m}
              onClick={() => setActiveMoodFilter(m)}
              className="px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer border"
              style={{
                backgroundColor: activeMoodFilter === m ? 'var(--color-accent-subtle)' : 'var(--color-surface-elevated)',
                color: activeMoodFilter === m ? 'var(--color-accent-text)' : 'var(--color-text-muted)',
                borderColor: activeMoodFilter === m ? 'var(--color-accent)' : 'var(--color-border)',
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Main Map Viewport */}
      <div className="relative rounded-2xl overflow-hidden border border-neutral-800 h-[520px] sm:h-[600px] w-full bg-[#0d0d0d] shadow-xl">
        {apiKey ? (
          <APIProvider apiKey={apiKey} onError={(err) => console.warn('Google Maps APIProvider:', err)}>
            <Map
              defaultCenter={mapCenter}
              defaultZoom={filteredEntries.length > 0 ? 3 : 2}
              mapId={mapId || 'DEMO_MAP_ID'}
              gestureHandling="greedy"
              className="w-full h-full"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            >
              {filteredEntries.map((entry) => {
                if (!entry.location) return null;
                const isSelected = selectedEntry?.id === entry.id;
                return (
                  <AdvancedMarker
                    key={entry.id}
                    position={{ lat: entry.location.lat, lng: entry.location.lng }}
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <Pin
                      background={isSelected ? '#fbbf24' : '#f59e0b'}
                      glyphColor="#141414"
                      borderColor="#78350f"
                      scale={isSelected ? 1.2 : 1.0}
                    />
                  </AdvancedMarker>
                );
              })}

              {selectedEntry && selectedEntry.location && (
                <InfoWindow
                  position={{ lat: selectedEntry.location.lat, lng: selectedEntry.location.lng }}
                  onCloseClick={() => setSelectedEntry(null)}
                >
                  <div className="p-2 text-neutral-900 max-w-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                        {selectedEntry.mood} &bull; {formatDate(selectedEntry.createdAt)}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-neutral-950 line-clamp-1">
                      {selectedEntry.title || 'Untitled Reflection'}
                    </h4>
                    <p className="text-xs text-neutral-600 line-clamp-2">
                      {selectedEntry.location.name}
                    </p>
                    {selectedEntry.insights?.summary && (
                      <p className="text-[11px] text-neutral-700 italic border-l-2 border-amber-500 pl-2 line-clamp-2">
                        "{selectedEntry.insights.summary}"
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => onSelectEntry(selectedEntry)}
                      className="w-full mt-1 py-1 px-2.5 rounded bg-neutral-900 text-neutral-100 text-xs font-semibold hover:bg-neutral-800 cursor-pointer text-center block"
                    >
                      Open Full Reflection &rarr;
                    </button>
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>
        ) : (
          /* Rich interactive fallback canvas */
          <div className="w-full h-full relative bg-[#0b0c10] flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden">
            {/* Ambient grid background */}
            <div
              className="absolute inset-0 opacity-40 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.08) 0%, transparent 60%), linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
                backgroundSize: '100% 100%, 32px 32px, 32px 32px',
              }}
            />

            {/* Render plotted pins on canvas */}
            {filteredEntries.map((entry, idx) => {
              if (!entry.location) return null;
              // Normalize lat/lng to screen percentages
              const xPercent = Math.min(Math.max(((entry.location.lng + 180) / 360) * 100, 5), 95);
              const yPercent = Math.min(Math.max(((90 - entry.location.lat) / 180) * 100, 10), 90);

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedEntry(entry)}
                  style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group cursor-pointer focus:outline-none"
                >
                  <div className="relative flex flex-col items-center">
                    <div className="px-2 py-0.5 rounded bg-neutral-950/90 text-amber-300 font-bold text-[10px] border border-amber-500/40 shadow-lg whitespace-nowrap mb-0.5 group-hover:scale-110 transition-transform">
                      {entry.location.name}
                    </div>
                    <div className="w-5 h-5 rounded-full bg-amber-500 text-neutral-950 flex items-center justify-center shadow-lg border border-amber-300 group-hover:scale-125 transition-transform animate-pulse">
                      <MapPin className="w-3 h-3" />
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Prompt overlay card */}
            <div
              className="max-w-md space-y-3 z-10 p-6 rounded-2xl border shadow-2xl backdrop-blur-md"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div
                className="w-10 h-10 rounded-xl border flex items-center justify-center mx-auto"
                style={{
                  backgroundColor: 'var(--color-accent-subtle)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-accent)',
                }}
              >
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
                  Google Maps Explorer Ready
                </h3>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {entriesWithLocation.length} reflection {entriesWithLocation.length === 1 ? 'spot is' : 'spots are'} pinned on your global canvas. Add a Google Maps API Key to render real-time vector and satellite tiles.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingKey(true)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-colors cursor-pointer"
                >
                  Add API Key
                </button>
                <a
                  href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold border flex items-center justify-center space-x-1 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-surface-elevated)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                >
                  <span>Free Demo Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Selected entry drawer on mobile/desktop */}
        {selectedEntry && (
          <div
            className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-96 z-30 border rounded-2xl p-4 shadow-2xl backdrop-blur-md space-y-2.5"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-accent)',
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold border uppercase"
                style={{
                  backgroundColor: 'var(--color-accent-subtle)',
                  color: 'var(--color-accent-text)',
                  borderColor: 'var(--color-border)',
                }}
              >
                {selectedEntry.mood} &bull; {formatRelativeDate(selectedEntry.createdAt)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="text-xs cursor-pointer p-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                ✕
              </button>
            </div>

            <div>
              <h4 className="font-serif-display font-bold text-base line-clamp-1" style={{ color: 'var(--color-text)' }}>
                {selectedEntry.title || 'Untitled Reflection'}
              </h4>
              <p className="text-xs flex items-center space-x-1 mt-0.5" style={{ color: 'var(--color-accent-text)' }}>
                <MapPin className="w-3 h-3" style={{ color: 'var(--color-accent)' }} />
                <span>{selectedEntry.location?.name}</span>
              </p>
            </div>

            <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              {selectedEntry.content}
            </p>

            {selectedEntry.insights?.summary && (
              <div
                className="p-2 rounded-lg border text-[11px] italic"
                style={{
                  backgroundColor: 'var(--color-surface-elevated)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                }}
              >
                "{selectedEntry.insights.summary}"
              </div>
            )}

            <button
              type="button"
              onClick={() => onSelectEntry(selectedEntry)}
              className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-colors cursor-pointer"
            >
              Open Reflection
            </button>
          </div>
        )}
      </div>

      {/* Empty State Help */}
      {entriesWithLocation.length === 0 && (
        <div
          className="rounded-2xl border p-8 text-center space-y-3"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto"
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              color: 'var(--color-text-muted)',
            }}
          >
            <MapPin className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>No Location Pins Yet</h3>
            <p className="text-xs mt-1 max-w-sm mx-auto" style={{ color: 'var(--color-text-muted)' }}>
              When writing or editing your reflections, click <strong>"Pin Location"</strong> to anchor your mindset to where you were.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
