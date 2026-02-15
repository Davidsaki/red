// src/app/api/projects/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql } from '@/lib/db';
import { projectSchema } from '@/lib/validations';
import { z } from 'zod';

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

// Edit project
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const projectId = parseInt(id, 10);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { success: false, error: 'ID de proyecto inválido' },
        { status: 400 }
      );
    }

    // Get user and verify ownership
    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    if (userResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    const userId = userResult.rows[0].id;

    const projectResult = await sql`SELECT employer_id FROM projects WHERE id = ${projectId}`;
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Proyecto no encontrado' }, { status: 404 });
    }
    if (projectResult.rows[0].employer_id !== userId) {
      return NextResponse.json({ success: false, error: 'No tienes permiso para editar este proyecto' }, { status: 403 });
    }

    const body = await request.json();
    const validation = projectSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.format() },
        { status: 400 }
      );
    }

    const { title, description, category, budget, skills_required, budget_currency } = validation.data;
    const skillsArray = `{${skills_required.map(s => `"${s.replace(/"/g, '\\"')}"`).join(',')}}`;
    const currency = budget_currency || 'COP';

    const result = await sql`
      UPDATE projects SET
        title = ${title},
        description = ${description},
        category = ${category},
        budget = ${budget},
        budget_currency = ${currency},
        skills_required = ${skillsArray}::text[],
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${projectId}
      RETURNING *
    `;

    return NextResponse.json({ success: true, project: result.rows[0] });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar proyecto' },
      { status: 500 }
    );
  }
}

// Change project status
const statusSchema = z.object({
  status: z.enum(['closed', 'completed', 'cancelled']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const projectId = parseInt(id, 10);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { success: false, error: 'ID de proyecto inválido' },
        { status: 400 }
      );
    }

    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    if (userResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    const userId = userResult.rows[0].id;

    const projectResult = await sql`SELECT employer_id FROM projects WHERE id = ${projectId}`;
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Proyecto no encontrado' }, { status: 404 });
    }
    if (projectResult.rows[0].employer_id !== userId) {
      return NextResponse.json({ success: false, error: 'No tienes permiso para modificar este proyecto' }, { status: 403 });
    }

    const body = await request.json();
    const validation = statusSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Status inválido. Opciones: closed, completed, cancelled' },
        { status: 400 }
      );
    }

    const result = await sql`
      UPDATE projects SET
        status = ${validation.data.status},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${projectId}
      RETURNING *
    `;

    return NextResponse.json({ success: true, project: result.rows[0] });
  } catch (error) {
    console.error('Error updating project status:', error);
    return NextResponse.json(
      { success: false, error: 'Error al cambiar status del proyecto' },
      { status: 500 }
    );
  }
}

// Delete project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const projectId = parseInt(id, 10);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { success: false, error: 'ID de proyecto inválido' },
        { status: 400 }
      );
    }

    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    if (userResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    const userId = userResult.rows[0].id;

    const projectResult = await sql`SELECT employer_id FROM projects WHERE id = ${projectId}`;
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Proyecto no encontrado' }, { status: 404 });
    }
    if (projectResult.rows[0].employer_id !== userId) {
      return NextResponse.json({ success: false, error: 'No tienes permiso para eliminar este proyecto' }, { status: 403 });
    }

    // Delete associated applications first, then the project
    await sql`DELETE FROM applications WHERE project_id = ${projectId}`;
    await sql`DELETE FROM projects WHERE id = ${projectId}`;

    return NextResponse.json({ success: true, message: 'Proyecto eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar proyecto' },
      { status: 500 }
    );
  }
}
