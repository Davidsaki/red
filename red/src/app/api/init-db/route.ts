// src/app/api/init-db/route.ts
import { NextResponse } from 'next/server';
import { initDatabase } from '@/lib/db';

export async function GET() {
  try {
    await initDatabase();
    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
