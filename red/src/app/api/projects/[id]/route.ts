// src/app/api/projects/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const projectId = parseInt(id, 10);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { success: false, error: 'ID de proyecto inválido' },
        { status: 400 }
      );
    }

    const result = await sql`
      SELECT p.*, u.name as employer_name, u.email as employer_email, u.image as employer_image
      FROM projects p
      JOIN users u ON p.employer_id = u.id
      WHERE p.id = ${projectId}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Proyecto no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      project: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener proyecto' },
      { status: 500 }
    );
  }
}
