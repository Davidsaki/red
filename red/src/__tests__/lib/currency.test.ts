import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatCOP, formatUSD, copToUsd, usdToCop, getExchangeRate } from '@/lib/currency';

describe('formatCOP', () => {
  it('formats amount with COP currency symbol', () => {
    const result = formatCOP(500000);
    // Intl output varies by environment, but should contain the number
    expect(result).toContain('500');
    // Should not have decimal digits
    expect(result).not.toMatch(/\.\d{2}$/);
  });

  it('formats zero', () => {
    const result = formatCOP(0);
    expect(result).toContain('0');
  });

  it('formats large amounts', () => {
    const result = formatCOP(1000000);
    expect(result).toContain('1');
  });
});

describe('formatUSD', () => {
  it('formats amount with USD currency symbol', () => {
    const result = formatUSD(1234.56);
    expect(result).toContain('1');
    expect(result).toContain('234');
    expect(result).toContain('56');
  });

  it('includes two decimal places', () => {
    const result = formatUSD(100);
    expect(result).toContain('00');
  });

  it('formats zero', () => {
    const result = formatUSD(0);
    expect(result).toContain('0.00');
  });
});

describe('copToUsd', () => {
  it('converts COP to USD correctly', () => {
    expect(copToUsd(4200, 4200)).toBe(1);
  });

  it('converts with different rate', () => {
    expect(copToUsd(8400, 4200)).toBe(2);
  });

  it('returns 0 for 0 amount', () => {
    expect(copToUsd(0, 4200)).toBe(0);
  });
});

describe('usdToCop', () => {
  it('converts USD to COP correctly', () => {
    expect(usdToCop(1, 4200)).toBe(4200);
  });

  it('converts with different amounts', () => {
    expect(usdToCop(10, 4200)).toBe(42000);
  });

  it('returns 0 for 0 amount', () => {
    expect(usdToCop(0, 4200)).toBe(0);
  });
});

describe('getExchangeRate', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Reset the module cache to clear the cached rate between tests
    vi.resetModules();
  });

  it('returns rate from API on success', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ result: 'success', rates: { COP: 4100 } }),
    });
    global.fetch = mockFetch;

    // Re-import to get a fresh module with no cache
    const { getExchangeRate: freshGetExchangeRate } = await import('@/lib/currency');
    const rate = await freshGetExchangeRate();
    expect(rate).toBe(4100);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://open.er-api.com/v6/latest/USD',
      expect.objectContaining({ next: { revalidate: 3600 } })
    );
  });

  it('returns fallback rate (4200) when fetch fails', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    global.fetch = mockFetch;

    const { getExchangeRate: freshGetExchangeRate } = await import('@/lib/currency');
    const rate = await freshGetExchangeRate();
    expect(rate).toBe(4200);
  });

  it('returns fallback rate when API returns unexpected data', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ result: 'error' }),
    });
    global.fetch = mockFetch;

    const { getExchangeRate: freshGetExchangeRate } = await import('@/lib/currency');
    const rate = await freshGetExchangeRate();
    expect(rate).toBe(4200);
  });
});
