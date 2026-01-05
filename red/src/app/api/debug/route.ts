// src/app/api/debug/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  // Only show in development or if explicitly enabled
  if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_DEBUG) {
    return NextResponse.json({ error: 'Debug endpoint disabled in production' }, { status: 403 });
  }

  return NextResponse.json({
    environment: process.env.NODE_ENV,
    envVars: {
      POSTGRES_URL: process.env.POSTGRES_URL ? '✅ Set' : '❌ Missing',
      DATABASE_URL: process.env.DATABASE_URL ? '✅ Set' : '❌ Missing',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || '❌ Missing',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing',
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing',
    },
  });
}
