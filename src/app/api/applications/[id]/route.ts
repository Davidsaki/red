// src/app/api/applications/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql } from '@/lib/db';
import { z } from 'zod';

const updateSchema = z.object({
  proposal: z.string().min(50, 'La propuesta debe tener al menos 50 caracteres'),
  bid: z.number().positive('La oferta debe ser un número positivo').optional(),
});

// Get a single application
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
    const appId = parseInt(id, 10);
    if (isNaN(appId)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    if (userResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    const userId = userResult.rows[0].id;

    const result = await sql`
      SELECT a.*, p.title as project_title, p.budget as project_budget,
             p.employer_id as project_employer_id
      FROM applications a
      JOIN projects p ON a.project_id = p.id
      WHERE a.id = ${appId}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Aplicación no encontrada' }, { status: 404 });
    }

    const app = result.rows[0];
    // Only the applicant or the project owner can view
    if (app.freelancer_id !== userId && app.project_employer_id !== userId) {
      return NextResponse.json({ success: false, error: 'No tienes permiso' }, { status: 403 });
    }

    return NextResponse.json({ success: true, application: app });
  } catch (error) {
    console.error('Error fetching application:', error);
    return NextResponse.json({ success: false, error: 'Error al obtener aplicación' }, { status: 500 });
  }
}

// Update own application
export async function PUT(
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

    // Verify ownership
    const appResult = await sql`SELECT freelancer_id FROM applications WHERE id = ${appId}`;
    if (appResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Aplicación no encontrada' }, { status: 404 });
    }
    if (appResult.rows[0].freelancer_id !== userId) {
      return NextResponse.json({ success: false, error: 'No tienes permiso para editar esta aplicación' }, { status: 403 });
    }

    const body = await request.json();
    const validation = updateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.format() },
        { status: 400 }
      );
    }

    const { proposal, bid } = validation.data;
    const result = await sql`
      UPDATE applications SET
        proposal = ${proposal},
        bid = ${bid ?? null}
      WHERE id = ${appId}
      RETURNING *
    `;

    return NextResponse.json({ success: true, application: result.rows[0] });
  } catch (error) {
    console.error('Error updating application:', error);
    return NextResponse.json({ success: false, error: 'Error al actualizar aplicación' }, { status: 500 });
  }
}

// Delete own application
export async function DELETE(
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

    // Verify ownership
    const appResult = await sql`SELECT freelancer_id FROM applications WHERE id = ${appId}`;
    if (appResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Aplicación no encontrada' }, { status: 404 });
    }
    if (appResult.rows[0].freelancer_id !== userId) {
      return NextResponse.json({ success: false, error: 'No tienes permiso para eliminar esta aplicación' }, { status: 403 });
    }

    await sql`DELETE FROM applications WHERE id = ${appId}`;

    return NextResponse.json({ success: true, message: 'Aplicación eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting application:', error);
    return NextResponse.json({ success: false, error: 'Error al eliminar aplicación' }, { status: 500 });
  }
}
