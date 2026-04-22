// src/app/api/init-db/route.ts
// Admin-only endpoint. Requires INIT_DB_SECRET header to prevent unauthorized calls.
import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, seedCategories } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // In production, require either admin session or a secret header
  if (process.env.NODE_ENV === 'production') {
    const secret = request.headers.get('x-init-secret');
    const expectedSecret = process.env.INIT_DB_SECRET;

    if (!expectedSecret || secret !== expectedSecret) {
      const session = await getServerSession(authOptions);
      if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
  }

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
