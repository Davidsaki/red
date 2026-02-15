'use client';

import { useState } from 'react';

interface CurrencyDisplayProps {
  amount: number;
  currency?: 'COP' | 'USD';
}

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function CurrencyDisplay({ amount, currency = 'COP' }: CurrencyDisplayProps) {
  const [showAlternate, setShowAlternate] = useState(false);
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleToggle(): Promise<void> {
    if (!rate && !loading) {
      setLoading(true);
      try {
        const res = await fetch('/api/exchange-rate');
        const data = await res.json();
        if (data.success) {
          setRate(data.rate);
        }
      } catch {
        // Use fallback
        setRate(4200);
      } finally {
        setLoading(false);
      }
    }
    setShowAlternate(!showAlternate);
  }

  const primaryDisplay = currency === 'COP' ? formatCOP(amount) : formatUSD(amount);

  let alternateDisplay = '';
  if (rate) {
    if (currency === 'COP') {
      alternateDisplay = `≈ ${formatUSD(amount / rate)}`;
    } else {
      alternateDisplay = `≈ ${formatCOP(amount * rate)}`;
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-semibold text-blue-600">{primaryDisplay}</span>
      <button
        type="button"
        onClick={handleToggle}
        className="text-xs text-gray-400 hover:text-gray-600 underline"
        title={showAlternate ? 'Ocultar conversión' : 'Ver en otra moneda'}
      >
        {loading ? '...' : showAlternate && rate ? alternateDisplay : '↔'}
      </button>
    </span>
  );
}
