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
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('mindreflect_maps_api_key') || envApiKey || '';
  });
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [activeMoodFilter, setActiveMoodFilter] = useState<string>('All');
  const [isEditingKey, setIsEditingKey] = useState<boolean>(false);
  const [keyInput, setKeyInput] = useState<string>('');

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

  const handleSaveKey = () => {
    const trimmed = keyInput.trim();
    if (trimmed) {
      localStorage.setItem('mindreflect_maps_api_key', trimmed);
      setApiKey(trimmed);
    }
    setIsEditingKey(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Controls */}
      <div className="bg-[#141414] rounded-2xl border border-neutral-800/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Compass className="w-5 h-5 text-amber-400" />
              <h2 className="font-serif-display text-2xl font-bold text-neutral-100">
                Geographic Reflection Map
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400">
              Visualizing {entriesWithLocation.length} location-aware reflections across the globe
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setIsEditingKey(!isEditingKey)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold border border-neutral-700/60 transition-colors cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>{apiKey ? 'Maps Key Active' : 'Configure API Key'}</span>
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

        {/* API Key configuration prompt */}
        {isEditingKey && (
          <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-200 flex items-center space-x-1.5">
                <Key className="w-4 h-4 text-amber-400" />
                <span>Google Maps Platform Integration Key</span>
              </span>
              <a
                href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center space-x-1"
              >
                <span>Obtain Free Demo Key</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <p className="text-xs text-neutral-400">
              Set <code className="text-amber-300">VITE_GOOGLE_MAPS_API_KEY</code> in your environment or paste your API key here. For development, you can use the zero-setup Google Maps Demo Key.
            </p>
            <div className="flex space-x-2">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={apiKey ? '••••••••••••••••••••' : 'Enter Google Maps API key...'}
                className="flex-1 bg-[#0d0d0d] border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleSaveKey}
                className="px-4 py-2 rounded-lg bg-amber-500 text-neutral-950 text-xs font-bold hover:bg-amber-400 cursor-pointer"
              >
                Save Key
              </button>
            </div>
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-neutral-800">
          <span className="text-xs font-semibold text-neutral-500 mr-2 flex items-center space-x-1">
            <Layers className="w-3.5 h-3.5" />
            <span>Mood:</span>
          </span>
          {moods.map((m) => (
            <button
              key={m}
              onClick={() => setActiveMoodFilter(m)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeMoodFilter === m
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40'
                  : 'bg-neutral-800/80 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 border border-neutral-700/50'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Main Map Viewport */}
      <div className="relative rounded-2xl overflow-hidden border border-neutral-800 h-[520px] sm:h-[600px] w-full bg-[#0d0d0d] shadow-xl">
        {apiKey ? (
          <APIProvider apiKey={apiKey}>
            <Map
              defaultCenter={mapCenter}
              defaultZoom={filteredEntries.length > 0 ? 3 : 2}
              mapId="DEMO_MAP_ID"
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
            <div className="max-w-md space-y-3 z-10 bg-neutral-900/90 p-6 rounded-2xl border border-neutral-800 shadow-2xl backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-100">
                  Google Maps Explorer Ready
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
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
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 flex items-center justify-center space-x-1 cursor-pointer"
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
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-96 z-30 bg-[#141414]/95 border border-amber-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-md space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 uppercase">
                {selectedEntry.mood} &bull; {formatRelativeDate(selectedEntry.createdAt)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="text-neutral-400 hover:text-neutral-200 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <h4 className="font-serif-display font-bold text-base text-neutral-100 line-clamp-1">
                {selectedEntry.title || 'Untitled Reflection'}
              </h4>
              <p className="text-xs text-amber-300 flex items-center space-x-1 mt-0.5">
                <MapPin className="w-3 h-3" />
                <span>{selectedEntry.location?.name}</span>
              </p>
            </div>

            <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
              {selectedEntry.content}
            </p>

            {selectedEntry.insights?.summary && (
              <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300 italic">
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
        <div className="bg-[#141414] rounded-2xl border border-neutral-800 p-8 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
            <MapPin className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-100">No Location Pins Yet</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
              When writing or editing your reflections, click <strong>"Pin Location"</strong> to anchor your mindset to where you were.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
