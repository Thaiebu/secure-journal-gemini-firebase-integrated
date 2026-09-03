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
        className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer hover:opacity-90"
        style={{
          backgroundColor: 'var(--color-surface-elevated)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text)',
        }}
      >
        <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
        <span>Pin Location</span>
      </button>
    );
  }

  return (
    <div
      className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium"
      style={{
        backgroundColor: 'var(--color-accent-subtle)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-accent-text)',
      }}
    >
      <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-accent)' }} />
      <button
        type="button"
        onClick={readOnly ? undefined : onOpenPicker}
        className={`hover:underline line-clamp-1 max-w-[200px] text-left font-semibold ${
          readOnly ? 'cursor-default' : 'cursor-pointer'
        }`}
        style={{ color: 'var(--color-accent-text)' }}
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
          className="ml-1 p-0.5 rounded cursor-pointer opacity-75 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--color-accent-text)' }}
          title="Remove pinned location"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
