// src/lib/currency.ts

const FALLBACK_RATE = 4200; // COP per 1 USD (approximate)
let cachedRate: { rate: number; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function getExchangeRate(): Promise<number> {
  // Return cached rate if still valid
  if (cachedRate && Date.now() - cachedRate.timestamp < CACHE_DURATION) {
    return cachedRate.rate;
  }

  try {
    const response = await fetch(
      'https://open.er-api.com/v6/latest/USD',
      { next: { revalidate: 3600 } }
    );
    const data = await response.json();

    if (data.result === 'success' && data.rates?.COP) {
      cachedRate = { rate: data.rates.COP, timestamp: Date.now() };
      return data.rates.COP;
    }
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
  }

  return FALLBACK_RATE;
}

export function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function copToUsd(copAmount: number, rate: number): number {
  return copAmount / rate;
}

export function usdToCop(usdAmount: number, rate: number): number {
  return usdAmount * rate;
}
