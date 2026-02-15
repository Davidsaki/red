// src/app/api/exchange-rate/route.ts
import { NextResponse } from 'next/server';
import { getExchangeRate } from '@/lib/currency';

export async function GET(): Promise<NextResponse> {
  try {
    const rate = await getExchangeRate();
    return NextResponse.json({ success: true, rate, currency: 'COP/USD' });
  } catch (error) {
    console.error('Error getting exchange rate:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener tasa de cambio' },
      { status: 500 }
    );
  }
}
