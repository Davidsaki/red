import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql } from '@/lib/db';
import { reviewSchema } from '@/lib/reviews';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const appId = parseInt(id, 10);
    if (isNaN(appId)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    if (userResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    const userId = userResult.rows[0].id;

    const appResult = await sql`
      SELECT a.id, a.status, a.freelancer_id, a.project_id, p.employer_id
      FROM applications a
      JOIN projects p ON p.id = a.project_id
      WHERE a.id = ${appId}
    `;
    if (appResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Aplicación no encontrada' }, { status: 404 });
    }
    const application = appResult.rows[0];
    if (application.employer_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'No tienes permiso para calificar esta contratación' },
        { status: 403 }
      );
    }
    if (application.status !== 'finished') {
      return NextResponse.json(
        { success: false, error: 'Solo puedes calificar contrataciones finalizadas' },
        { status: 409 }
      );
    }

    const body = await request.json().catch(() => null);
    const validation = reviewSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const { rating, comment } = validation.data;

    const result = await sql`
      INSERT INTO reviews (application_id, project_id, reviewer_id, reviewee_id, rating, comment)
      VALUES (${appId}, ${application.project_id}, ${userId}, ${application.freelancer_id}, ${rating}, ${comment})
      ON CONFLICT (application_id) DO UPDATE
        SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = NOW()
      RETURNING *
    `;

    return NextResponse.json({ success: true, review: result.rows[0] });
  } catch (error) {
    console.error('Error saving review:', error);
    return NextResponse.json(
      { success: false, error: 'Error al guardar la calificación' },
      { status: 500 }
    );
  }
}
