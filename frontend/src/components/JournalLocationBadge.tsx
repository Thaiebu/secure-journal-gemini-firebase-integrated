import React from 'react';
import { EntryLocation } from '../types';
import { MapPin, X, ExternalLink } from 'lucide-react';

interface JournalLocationBadgeProps {
  location: EntryLocation | null | undefined;
  onOpenPicker: () => void;
  onRemoveLocation?: () => void;
  readOnly?: boolean;
}

export const JournalLocationBadge: React.FC<JournalLocationBadgeProps> = ({
  location,
  onOpenPicker,
  onRemoveLocation,
  readOnly = false,
}) => {
  if (!location) {
    if (readOnly) return null;
    return (
      <button
        id="btn-add-location-pin"
        type="button"
        onClick={onOpenPicker}
        className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-neutral-400 hover:text-amber-300 border border-neutral-700/60 text-xs font-medium transition-all cursor-pointer"
      >
        <MapPin className="w-3.5 h-3.5 text-neutral-500 group-hover:text-amber-400" />
        <span>Pin Location</span>
      </button>
    );
  }

  return (
    <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <button
        type="button"
        onClick={readOnly ? undefined : onOpenPicker}
        className={`hover:underline line-clamp-1 max-w-[200px] text-left font-semibold ${
          readOnly ? 'cursor-default' : 'cursor-pointer'
        }`}
        title={`${location.name}${location.address ? ` (${location.address})` : ''} - [${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}]`}
      >
        {location.name}
      </button>

      {!readOnly && onRemoveLocation && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemoveLocation();
          }}
          className="text-amber-400/70 hover:text-amber-200 ml-1 p-0.5 rounded hover:bg-amber-500/20 cursor-pointer"
          title="Remove pinned location"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
