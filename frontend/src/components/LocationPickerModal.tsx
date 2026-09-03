import React, { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { EntryLocation } from '../types';
import {
  MapPin,
  X,
  Search,
  Navigation,
  Check,
  AlertCircle,
  Key,
  ExternalLink,
  Info,
} from 'lucide-react';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: EntryLocation | null;
  onSaveLocation: (location: EntryLocation | null) => void;
}

const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 }; // San Francisco default

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onSaveLocation,
}) => {
  const envApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';
  const envMapId = (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string) || '';
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('mindreflect_maps_api_key') || envApiKey || '';
  });
  const [mapId, setMapId] = useState<string>(() => {
    return localStorage.getItem('mindreflect_maps_map_id') || envMapId || 'DEMO_MAP_ID';
  });
  const [isEditingKey, setIsEditingKey] = useState<boolean>(false);
  const [keyInput, setKeyInput] = useState<string>('');
  const [mapIdInput, setMapIdInput] = useState<string>('');

  const [locationName, setLocationName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number }>(
    currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng } : DEFAULT_CENTER
  );
  const [hasMarker, setHasMarker] = useState<boolean>(!!currentLocation);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      if (currentLocation) {
        setLocationName(currentLocation.name);
        setAddress(currentLocation.address || currentLocation.formattedAddress || '');
        setCoordinates({ lat: currentLocation.lat, lng: currentLocation.lng });
        setHasMarker(true);
      } else {
        setLocationName('');
        setAddress('');
        setCoordinates(DEFAULT_CENTER);
        setHasMarker(false);
      }
      setLocationError(null);
    }
  }, [isOpen, currentLocation]);

  if (!isOpen) return null;

  const handleMapClick = (e: any) => {
    if (e.detail && e.detail.latLng) {
      const { lat, lng } = e.detail.latLng;
      setCoordinates({ lat, lng });
      setHasMarker(true);
      if (!locationName) {
        setLocationName(`Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      }
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCoordinates(coords);
        setHasMarker(true);
        if (!locationName) {
          setLocationName('Current Reflection Spot');
        }
        setAddress(`Lat: ${coords.lat.toFixed(5)}, Lng: ${coords.lng.toFixed(5)}`);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        setLocationError(`Unable to retrieve location: ${err.message}. You can manually click on the map or enter coordinates.`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

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

  const handleApplyLocation = () => {
    if (!hasMarker) {
      setLocationError('Please select or pin a location on the map before saving.');
      return;
    }

    const entryLoc: EntryLocation = {
      name: locationName.trim() || 'Reflection Spot',
      address: address.trim() || undefined,
      lat: coordinates.lat,
      lng: coordinates.lng,
      formattedAddress: address.trim() || undefined,
    };

    onSaveLocation(entryLoc);
    onClose();
  };

  const handleRemoveLocation = () => {
    onSaveLocation(null);
    onClose();
  };

  // Quick preset locations for reflective journaling spots
  const presets = [
    { name: 'San Francisco, CA', lat: 37.7749, lng: -122.4194 },
    { name: 'New York, NY', lat: 40.7128, lng: -74.006 },
    { name: 'London, UK', lat: 51.5074, lng: -0.1278 },
    { name: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503 },
    { name: 'Kyoto Zen Garden', lat: 35.0116, lng: 135.7681 },
    { name: 'Yosemite National Park', lat: 37.8651, lng: -119.5383 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs">
      <div
        className="rounded-2xl border shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center space-x-2">
            <div
              className="w-8 h-8 rounded-xl border flex items-center justify-center"
              style={{
                backgroundColor: 'var(--color-accent-subtle)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-accent)',
              }}
            >
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>Pin Location to Reflection</h3>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Anchor your insights to a physical place using Google Maps Platform
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg cursor-pointer transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Quick controls bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--color-accent-subtle)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-accent-text)',
                }}
              >
                <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Acquiring GPS...' : 'Use Current Location'}</span>
              </button>

              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>or click anywhere on the map</span>
            </div>

            {/* API Key configuration toggle */}
            <button
              type="button"
              onClick={() => {
                if (!isEditingKey) {
                  setKeyInput(apiKey);
                  setMapIdInput(mapId === 'DEMO_MAP_ID' ? '' : mapId);
                }
                setIsEditingKey(!isEditingKey);
              }}
              className="inline-flex items-center space-x-1 text-[11px] cursor-pointer"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <Key className="w-3 h-3" style={{ color: 'var(--color-accent)' }} />
              <span>{apiKey ? 'Maps Configured' : 'Configure Maps Key'}</span>
            </button>
          </div>

          {/* Key configuration panel */}
          {isEditingKey && (
            <div
              className="p-3.5 rounded-xl border space-y-2.5"
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold flex items-center space-x-1" style={{ color: 'var(--color-text)' }}>
                  <Key className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
                  <span>Google Maps Platform Configuration</span>
                </span>
                <a
                  href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] hover:underline flex items-center space-x-0.5"
                  style={{ color: 'var(--color-accent-text)' }}
                >
                  <span>Get Free Demo Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                Set <code className="font-semibold" style={{ color: 'var(--color-accent-text)' }}>VITE_GOOGLE_MAPS_API_KEY</code> in your environment or paste your API key below. For prototyping, the zero-cost Maps Demo Key is supported.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Google Maps API Key
                  </label>
                  <input
                    type="password"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder={apiKey ? '••••••••••••••••••••' : 'Enter Google Maps API key...'}
                    className="w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Map ID (Optional Cloud Vector Map ID)
                  </label>
                  <input
                    type="text"
                    value={mapIdInput}
                    onChange={(e) => setMapIdInput(e.target.value)}
                    placeholder="Optional, defaults to DEMO_MAP_ID"
                    className="w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none"
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
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-neutral-950 text-xs font-bold hover:bg-amber-400 cursor-pointer shadow-xs active:scale-98"
                >
                  Save Settings
                </button>
              </div>
            </div>
          )}

          {locationError && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{locationError}</span>
            </div>
          )}

          {/* Interactive Google Map Container */}
          <div className="relative rounded-xl overflow-hidden border border-neutral-800 h-64 sm:h-72 w-full bg-neutral-900">
            {apiKey ? (
              <APIProvider apiKey={apiKey} onError={(err) => console.warn('Google Maps APIProvider:', err)}>
                <Map
                  defaultCenter={coordinates}
                  center={coordinates}
                  defaultZoom={hasMarker ? 13 : 4}
                  mapId={mapId || 'DEMO_MAP_ID'}
                  onClick={handleMapClick}
                  gestureHandling="greedy"
                  className="w-full h-full"
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                >
                  {hasMarker && (
                    <AdvancedMarker position={coordinates}>
                      <Pin background="#f59e0b" glyphColor="#141414" borderColor="#b45309" />
                    </AdvancedMarker>
                  )}
                </Map>
              </APIProvider>
            ) : (
              // Clean interactive map canvas placeholder with pin positioning when API key is awaiting configuration
              <div
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = (e.clientX - rect.left) / rect.width;
                  const y = (e.clientY - rect.top) / rect.height;
                  // Map relative click to approximate coordinates
                  const lat = 60 - y * 100;
                  const lng = -140 + x * 280;
                  setCoordinates({ lat, lng });
                  setHasMarker(true);
                  if (!locationName) {
                    setLocationName(`Pinned Spot (${lat.toFixed(2)}, ${lng.toFixed(2)})`);
                  }
                }}
                className="w-full h-full relative cursor-crosshair bg-[#0d0e12] flex flex-col items-center justify-center p-4 text-center select-none"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.05) 0%, transparent 70%), linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
                  backgroundSize: '100% 100%, 24px 24px, 24px 24px',
                }}
              >
                {hasMarker && (
                  <div className="absolute z-10 flex flex-col items-center -translate-x-1/2 -translate-y-full top-1/2 left-1/2 animate-bounce">
                    <div className="px-2 py-0.5 rounded bg-amber-500 text-neutral-950 font-bold text-[10px] shadow-md">
                      {locationName || 'Pinned Spot'}
                    </div>
                    <MapPin className="w-6 h-6 text-amber-400 fill-amber-400/30" />
                  </div>
                )}
                <div
                  className="max-w-xs space-y-1 z-0 p-3 rounded-xl border backdrop-blur-xs"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
                    Interactive Location Canvas
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                    Click anywhere to pin coordinates, or paste a Google Maps API Key to render live satellite & vector tiles.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Quick Inspiration Places:</span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    setCoordinates({ lat: p.lat, lng: p.lng });
                    setLocationName(p.name);
                    setAddress(p.name);
                    setHasMarker(true);
                  }}
                  className="px-2 py-1 rounded-lg text-[11px] border transition-colors cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-surface-elevated)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Details Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                Location Name <span style={{ color: 'var(--color-accent)' }}>*</span>
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g., Home Office, Central Park, Tokyo Studio"
                className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                Address / Descriptive Note
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g., Near the pond at dusk"
                className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                }}
              />
            </div>
          </div>

          {/* Coordinates readout */}
          {hasMarker && (
            <div
              className="px-3 py-2 rounded-xl border text-[11px] flex items-center justify-between"
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-muted)',
              }}
            >
              <span>Latitude: <strong style={{ color: 'var(--color-text)' }}>{coordinates.lat.toFixed(5)}</strong></span>
              <span>Longitude: <strong style={{ color: 'var(--color-text)' }}>{coordinates.lng.toFixed(5)}</strong></span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div
          className="px-5 py-3.5 border-t flex items-center justify-between"
          style={{
            backgroundColor: 'var(--color-surface-elevated)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div>
            {currentLocation && (
              <button
                type="button"
                onClick={handleRemoveLocation}
                className="text-xs text-rose-500 hover:text-rose-600 font-semibold cursor-pointer"
              >
                Remove Pin
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyLocation}
              disabled={!hasMarker}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shadow-xs disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Attach Pin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
