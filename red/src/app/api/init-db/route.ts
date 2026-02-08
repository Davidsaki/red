// src/app/api/init-db/route.ts
import { NextResponse } from 'next/server';
import { initDatabase, seedCategories } from '@/lib/db';

export async function GET() {
  try {
    await initDatabase();
    await seedCategories();
    return NextResponse.json({
      success: true,
      message: 'Database initialized and categories seeded successfully',
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
