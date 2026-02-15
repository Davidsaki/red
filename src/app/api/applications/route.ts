// src/app/api/applications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql } from '@/lib/db';
import { applicationSchema } from '@/lib/validations';

// Create a new application
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    if (userResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    const userId = userResult.rows[0].id;

    const body = await request.json();
    const validation = applicationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.format() },
        { status: 400 }
      );
    }

    const { project_id, proposal, bid } = validation.data;

    // Verify project exists and is open
    const projectResult = await sql`
      SELECT id, employer_id, status FROM projects WHERE id = ${project_id}
    `;
    if (projectResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Proyecto no encontrado' },
        { status: 404 }
      );
    }
    if (projectResult.rows[0].status !== 'open') {
      return NextResponse.json(
        { success: false, error: 'Este proyecto no está abierto para aplicaciones' },
        { status: 400 }
      );
    }
    // Check for duplicate application
    const existingApp = await sql`
      SELECT id FROM applications WHERE project_id = ${project_id} AND freelancer_id = ${userId}
    `;
    if (existingApp.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Ya has aplicado a este proyecto' },
        { status: 409 }
      );
    }

    const result = await sql`
      INSERT INTO applications (project_id, freelancer_id, proposal, bid, status)
      VALUES (${project_id}, ${userId}, ${proposal}, ${bid ?? null}, 'pending')
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      application: result.rows[0],
      message: 'Aplicación enviada exitosamente',
    });
  } catch (error) {
    console.error('Error creating application:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear aplicación' },
      { status: 500 }
    );
  }
}

// List user's applications
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    if (userResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    const userId = userResult.rows[0].id;

    const result = await sql`
      SELECT a.*, p.title as project_title, p.budget as project_budget,
             p.budget_currency as project_budget_currency, p.status as project_status
      FROM applications a
      JOIN projects p ON a.project_id = p.id
      WHERE a.freelancer_id = ${userId}
      ORDER BY a.created_at DESC
    `;

    return NextResponse.json({
      success: true,
      applications: result.rows,
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener aplicaciones' },
      { status: 500 }
    );
  }
}
