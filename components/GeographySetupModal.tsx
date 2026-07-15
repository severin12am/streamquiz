'use client';
// ============================================================
// GeographySetupModal — pick question types + regions (EN only).
// ============================================================

import React, { useEffect, useState } from 'react';
import {
  GEOGRAPHY_REGIONS,
  GEOGRAPHY_TYPE_LABELS,
  GEOGRAPHY_TYPES,
  type GeographyConfig,
  type GeographyRegion,
  type GeographyType,
} from '@/lib/geography/types';

interface GeographySetupModalProps {
  open: boolean;
  initial?: GeographyConfig | null;
  onClose: () => void;
  onConfirm: (config: GeographyConfig) => void;
}

const MIXABLE: GeographyType[] = GEOGRAPHY_TYPES.filter((t) => t !== 'eliminate');

export default function GeographySetupModal({
  open,
  initial,
  onClose,
  onConfirm,
}: GeographySetupModalProps) {
  const [types, setTypes] = useState<GeographyType[]>(['map']);
  const [regions, setRegions] = useState<GeographyRegion[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial?.types?.length) {
      setTypes(initial.types);
      setRegions(initial.regions ?? []);
    } else {
      setTypes(['map']);
      setRegions([]);
    }
    setError(null);
  }, [open, initial]);

  if (!open) return null;

  const eliminateOn = types.includes('eliminate');

  function toggleType(t: GeographyType) {
    setError(null);
    if (t === 'eliminate') {
      setTypes((prev) => (prev.includes('eliminate') ? [] : ['eliminate']));
      return;
    }
    setTypes((prev) => {
      const withoutElim = prev.filter((x) => x !== 'eliminate');
      if (withoutElim.includes(t)) {
        return withoutElim.filter((x) => x !== t);
      }
      return [...withoutElim, t];
    });
  }

  function toggleRegion(r: GeographyRegion) {
    setRegions((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
    );
  }

  function handleConfirm() {
    if (types.length === 0) {
      setError('Select at least one question type.');
      return;
    }
    onConfirm({
      types: eliminateOn ? ['eliminate'] : types,
      regions,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6"
      style={{ background: 'rgba(20, 24, 30, 0.45)' }}
      role="dialog"
      aria-modal
      aria-label="Geography quiz setup"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-5 sm:p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.22)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Geography quiz
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Pick question types and regions. Settings like cameras and game mode
              stay on the main form.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="keycap keycap-secondary px-3 py-1.5 rounded-lg text-sm"
          >
            Close
          </button>
        </div>

        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
            Question types
          </p>
          <div className="flex flex-col gap-2">
            {MIXABLE.map((t) => (
              <button
                key={t}
                type="button"
                disabled={eliminateOn}
                onClick={() => toggleType(t)}
                className={`keycap py-2.5 px-3 rounded-xl text-left text-sm ${
                  !eliminateOn && types.includes(t)
                    ? 'keycap-primary'
                    : 'keycap-secondary'
                } ${eliminateOn ? 'opacity-50' : ''}`}
              >
                {GEOGRAPHY_TYPE_LABELS[t]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => toggleType('eliminate')}
              className={`keycap py-2.5 px-3 rounded-xl text-left text-sm ${
                eliminateOn ? 'keycap-primary' : 'keycap-secondary'
              }`}
            >
              {GEOGRAPHY_TYPE_LABELS.eliminate}
            </button>
          </div>
          {eliminateOn && (
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Eliminate plays every country in the selected region(s) (map ID).
              Other types are turned off.
            </p>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
            Regions
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRegions([])}
              className={`keycap py-2 px-3 rounded-xl text-sm ${
                regions.length === 0 ? 'keycap-primary' : 'keycap-secondary'
              }`}
            >
              World
            </button>
            {GEOGRAPHY_REGIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => toggleRegion(r)}
                className={`keycap py-2 px-3 rounded-xl text-sm ${
                  regions.includes(r) ? 'keycap-primary' : 'keycap-secondary'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            Leave World selected, or pick one or more continents.
          </p>
        </div>

        {error && (
          <p className="text-sm" style={{ color: 'var(--wrong)' }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          className="keycap keycap-primary py-3 rounded-xl font-semibold text-sm text-white"
        >
          Use Geography
        </button>
      </div>
    </div>
  );
}
