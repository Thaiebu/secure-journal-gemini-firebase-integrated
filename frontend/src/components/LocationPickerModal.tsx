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
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('mindreflect_maps_api_key') || envApiKey || '';
  });
  const [isEditingKey, setIsEditingKey] = useState<boolean>(false);
  const [keyInput, setKeyInput] = useState<string>('');

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

  const handleSaveKey = () => {
    const trimmed = keyInput.trim();
    if (trimmed) {
      localStorage.setItem('mindreflect_maps_api_key', trimmed);
      setApiKey(trimmed);
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
      <div className="bg-[#141414] rounded-2xl border border-neutral-800 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-100">Pin Location to Reflection</h3>
              <p className="text-xs text-neutral-400">
                Anchor your insights to a physical place using Google Maps Platform
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 p-1.5 rounded-lg hover:bg-neutral-800 cursor-pointer"
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
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Acquiring GPS...' : 'Use Current Location'}</span>
              </button>

              <span className="text-xs text-neutral-500">or click anywhere on the map</span>
            </div>

            {/* API Key configuration toggle */}
            <button
              type="button"
              onClick={() => setIsEditingKey(!isEditingKey)}
              className="inline-flex items-center space-x-1 text-[11px] text-neutral-400 hover:text-neutral-200 cursor-pointer"
            >
              <Key className="w-3 h-3 text-amber-400" />
              <span>{apiKey ? 'API Key Configured' : 'Configure Maps Key'}</span>
            </button>
          </div>

          {/* Key configuration panel */}
          {isEditingKey && (
            <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-200 flex items-center space-x-1">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Google Maps Platform API Key</span>
                </span>
                <a
                  href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center space-x-0.5"
                >
                  <span>Get Free Demo Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-[11px] text-neutral-400">
                You can provide a production restricted Google Maps API key or a zero-cost Maps Demo Key for prototyping.
              </p>
              <div className="flex space-x-2">
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder={apiKey ? '••••••••••••••••••••' : 'Enter Google Maps API key...'}
                  className="flex-1 bg-[#0d0d0d] border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleSaveKey}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-neutral-950 text-xs font-bold hover:bg-amber-400 cursor-pointer"
                >
                  Save Key
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
              <APIProvider apiKey={apiKey}>
                <Map
                  defaultCenter={coordinates}
                  center={coordinates}
                  defaultZoom={hasMarker ? 13 : 4}
                  mapId="DEMO_MAP_ID"
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
                <div className="max-w-xs space-y-1 z-0 bg-neutral-950/80 p-3 rounded-xl border border-neutral-800/80 backdrop-blur-xs">
                  <p className="text-xs font-semibold text-neutral-200">
                    Interactive Location Canvas
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    Click anywhere to pin coordinates, or paste a Google Maps API Key to render live satellite & vector tiles.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-neutral-400">Quick Inspiration Places:</span>
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
                  className="px-2 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 text-[11px] border border-neutral-700/60 transition-colors cursor-pointer"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Details Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-neutral-800">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Location Name <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g., Home Office, Central Park, Tokyo Studio"
                className="w-full bg-[#0d0d0d] border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Address / Descriptive Note
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g., Near the pond at dusk"
                className="w-full bg-[#0d0d0d] border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Coordinates readout */}
          {hasMarker && (
            <div className="px-3 py-2 bg-neutral-900 rounded-xl border border-neutral-800/80 text-[11px] text-neutral-400 flex items-center justify-between">
              <span>Latitude: <strong className="text-neutral-200">{coordinates.lat.toFixed(5)}</strong></span>
              <span>Longitude: <strong className="text-neutral-200">{coordinates.lng.toFixed(5)}</strong></span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3.5 border-t border-neutral-800 flex items-center justify-between bg-neutral-900/50">
          <div>
            {currentLocation && (
              <button
                type="button"
                onClick={handleRemoveLocation}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
              >
                Remove Pin
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-neutral-400 hover:text-neutral-200 text-xs font-medium cursor-pointer"
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
