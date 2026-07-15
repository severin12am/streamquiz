'use client';
// ============================================================
// CountryMap — Leaflet map with one country highlighted (no labels).
// ============================================================

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface CountryMapProps {
  /** ISO alpha-2 of the country to highlight. */
  focusCode: string;
  /** ISO codes to include when fitting the view (region). Empty = focus only. */
  scopeCodes?: string[];
  className?: string;
}

const GEO_URL = '/geo/countries-110m.geojson';

let geoCache: GeoJSON.FeatureCollection | null = null;
let geoPromise: Promise<GeoJSON.FeatureCollection> | null = null;

function loadGeo(): Promise<GeoJSON.FeatureCollection> {
  if (geoCache) return Promise.resolve(geoCache);
  if (!geoPromise) {
    geoPromise = fetch(GEO_URL)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load map data');
        return r.json();
      })
      .then((data: GeoJSON.FeatureCollection) => {
        geoCache = data;
        return data;
      });
  }
  return geoPromise;
}

export default function CountryMap({
  focusCode,
  scopeCodes = [],
  className = '',
}: CountryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    const focus = focusCode.toUpperCase();
    const scopeSet = new Set(
      (scopeCodes.length ? scopeCodes : [focus]).map((c) => c.toUpperCase()),
    );
    // Drawing an entire continent every round is fine; World (100+) is too heavy.
    const drawAllScope = scopeSet.size > 0 && scopeSet.size <= 60;

    const map = L.map(el, {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
    });
    mapRef.current = map;

    // Neutral basemap without place names (Carto light nolabels).
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 8,
      minZoom: 1,
    }).addTo(map);

    void loadGeo().then((geo) => {
      if (cancelled) return;

      const features = geo.features.filter((f) => {
        const code = String(
          (f.properties as { ISO_A2?: string } | null)?.ISO_A2 ?? '',
        ).toUpperCase();
        if (code === focus) return true;
        return drawAllScope && scopeSet.has(code);
      });

      const layer = L.geoJSON(
        { type: 'FeatureCollection', features } as GeoJSON.FeatureCollection,
        {
          style: (feat) => {
            const code = String(
              (feat?.properties as { ISO_A2?: string } | null)?.ISO_A2 ?? '',
            ).toUpperCase();
            const isFocus = code === focus;
            return {
              color: isFocus ? '#2f7d77' : '#9aa4b2',
              weight: isFocus ? 2 : 0.6,
              fillColor: isFocus ? '#2f7d77' : '#d7dde5',
              fillOpacity: isFocus ? 0.85 : 0.35,
            };
          },
          onEachFeature: (feat, lyr) => {
            // No tooltips / popups — countries stay unnamed.
            lyr.off();
          },
        },
      ).addTo(map);

      const focusLayer = L.geoJSON(
        {
          type: 'FeatureCollection',
          features: features.filter((f) => {
            const code = String(
              (f.properties as { ISO_A2?: string } | null)?.ISO_A2 ?? '',
            ).toUpperCase();
            return code === focus;
          }),
        } as GeoJSON.FeatureCollection,
      );
      const bounds = focusLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.55), { maxZoom: 6, animate: false });
      } else {
        const all = layer.getBounds();
        if (all.isValid()) map.fitBounds(all.pad(0.1), { maxZoom: 4, animate: false });
      }

      // Leaflet needs a kick after layout in flex containers.
      requestAnimationFrame(() => map.invalidateSize());
    });

    return () => {
      cancelled = true;
      map.remove();
      mapRef.current = null;
    };
  }, [focusCode, scopeCodes.join(',')]);

  return (
    <div
      ref={containerRef}
      className={`w-full rounded-xl overflow-hidden border border-[var(--border)] ${className}`}
      style={{ height: '11rem', minHeight: '9rem', zIndex: 0 }}
    />
  );
}
