'use client';

import { useState } from 'react';

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
}

const STARS = [1, 2, 3, 4, 5];

export default function StarRatingInput({ value, onChange, label = 'Calificación' }: StarRatingInputProps) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(5, (value || 0) + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(1, (value || 2) - 1));
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div
        role="radiogroup"
        aria-label={label}
        onMouseLeave={() => setHover(0)}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-0.5"
      >
        {STARS.map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} de 5`}
            tabIndex={value === star || (value === 0 && star === 1) ? 0 : -1}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            className="p-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <svg
              className={`w-8 h-8 transition-colors ${star <= shown ? 'text-yellow-400' : 'text-gray-200'}`}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M10 1.5l2.6 5.3 5.9.9-4.25 4.15 1 5.85L10 14.9l-5.25 2.8 1-5.85L1.5 7.7l5.9-.9L10 1.5z" />
            </svg>
          </button>
        ))}
      </div>
      <span className="text-sm text-gray-500" aria-live="polite">
        {shown > 0 ? `${shown} de 5` : 'Sin seleccionar'}
      </span>
    </div>
  );
}
