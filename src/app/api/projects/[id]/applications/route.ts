// src/app/api/projects/[id]/applications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql } from '@/lib/db';

// Get all applications for a project (owner only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = parseInt(id, 10);
    if (isNaN(projectId)) {
      return NextResponse.json({ success: false, error: 'ID de proyecto inválido' }, { status: 400 });
    }

    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    if (userResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    const userId = userResult.rows[0].id;

    // Verify project ownership
    const projectResult = await sql`SELECT employer_id FROM projects WHERE id = ${projectId}`;
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Proyecto no encontrado' }, { status: 404 });
    }
    if (projectResult.rows[0].employer_id !== userId) {
      return NextResponse.json({ success: false, error: 'No tienes permiso' }, { status: 403 });
    }

    const result = await sql`
      SELECT a.*, u.name as freelancer_name, u.email as freelancer_email, u.image as freelancer_image
      FROM applications a
      JOIN users u ON a.freelancer_id = u.id
      WHERE a.project_id = ${projectId}
      ORDER BY a.created_at DESC
    `;

    return NextResponse.json({
      success: true,
      applications: result.rows,
    });
  } catch (error) {
    console.error('Error fetching project applications:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener aplicaciones' },
      { status: 500 }
    );
  }
}
