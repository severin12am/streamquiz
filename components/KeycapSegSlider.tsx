'use client';

import {
  useCallback,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

interface KeycapSegSliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  'aria-label': string;
}

const HANDLE = '2.25rem';

function slotLeft(index: number, segments: number) {
  const t = segments > 1 ? index / (segments - 1) : 0;
  return `calc((100% - ${HANDLE}) * ${t})`;
}

function slotCenter(index: number, segments: number) {
  const t = segments > 1 ? index / (segments - 1) : 0;
  return `calc((100% - ${HANDLE}) * ${t} + ${HANDLE} / 2)`;
}

export default function KeycapSegSlider({
  min,
  max,
  value,
  onChange,
  'aria-label': ariaLabel,
}: KeycapSegSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const segments = max - min + 1;
  const index = value - min;
  const handleLeft = slotLeft(index, segments);

  const snapTo = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const { left, width } = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - left) / width));
      const idx = Math.round(ratio * (max - min));
      onChange(min + idx);
    },
    [min, max, onChange],
  );

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    snapTo(e.clientX);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    snapTo(e.clientX);
  }

  function stopDrag(e: PointerEvent<HTMLDivElement>) {
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(min, value - 1));
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(max, value + 1));
    }
  }

  return (
    <div className="seg-slider">
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        className="seg-slider-rail"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onKeyDown={onKeyDown}
      >
        <div className="seg-slider-markers" aria-hidden>
          {Array.from({ length: segments }, (_, i) => (
            <span
              key={i}
              className="seg-slider-marker"
              style={{ left: slotCenter(i, segments) }}
            />
          ))}
        </div>
        <div className="seg-slider-fill" style={{ width: handleLeft }} aria-hidden />
        <div className="seg-slider-handle" style={{ left: handleLeft }}>
          {value}
        </div>
      </div>
    </div>
  );
}
