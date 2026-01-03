// src/app/api/users/route.ts
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// Get all users (for development/debugging only)
export async function GET() {
  try {
    const result = await sql`
      SELECT id, email, name, image, subscription_tier, created_at
      FROM users
      ORDER BY created_at DESC
    `;

    return NextResponse.json({
      success: true,
      users: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
