import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql, pool } from '@/lib/db';
import { sendContractorSelectedEmail } from '@/lib/email';

export async function POST(
  _request: NextRequest,
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

    const client = await pool.connect();
    let freelancerEmail: string;
    let projectId: number;
    let projectTitle: string;
    try {
      await client.query('BEGIN');

      const lookup = await client.query('SELECT project_id FROM applications WHERE id = $1', [appId]);
      if (lookup.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'Aplicación no encontrada' }, { status: 404 });
      }

      const projectResult = await client.query(
        'SELECT id, title, employer_id, status FROM projects WHERE id = $1 FOR UPDATE',
        [lookup.rows[0].project_id]
      );
      const project = projectResult.rows[0];
      if (!project) {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'Proyecto no encontrado' }, { status: 404 });
      }
      if (project.employer_id !== userId) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'No tienes permiso para seleccionar contratistas en este proyecto' },
          { status: 403 }
        );
      }
      if (project.status !== 'open') {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'El proyecto no está abierto para seleccionar un contratista' },
          { status: 409 }
        );
      }

      const appResult = await client.query(
        `SELECT a.status, u.email AS freelancer_email
         FROM applications a JOIN users u ON u.id = a.freelancer_id
         WHERE a.id = $1 AND a.project_id = $2 FOR UPDATE OF a`,
        [appId, project.id]
      );
      if (appResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'Aplicación no encontrada' }, { status: 404 });
      }
      if (appResult.rows[0].status !== 'pending') {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Esta aplicación ya no está pendiente' },
          { status: 409 }
        );
      }

      await client.query(
        `UPDATE applications SET status = 'accepted', selected_at = NOW() WHERE id = $1`,
        [appId]
      );
      await client.query(
        `UPDATE projects SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [project.id]
      );

      await client.query('COMMIT');
      freelancerEmail = appResult.rows[0].freelancer_email;
      projectId = project.id;
      projectTitle = project.title;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      if ((error as { code?: string }).code === '23505') {
        return NextResponse.json(
          { success: false, error: 'Este proyecto ya tiene un contratista seleccionado' },
          { status: 409 }
        );
      }
      throw error;
    } finally {
      client.release();
    }

    let notified = false;
    try {
      await sendContractorSelectedEmail(freelancerEmail, projectId, projectTitle);
      notified = true;
    } catch (error) {
      console.error('Error sending contractor selected email:', error);
    }

    return NextResponse.json({ success: true, notified });
  } catch (error) {
    console.error('Error selecting contractor:', error);
    return NextResponse.json(
      { success: false, error: 'Error al seleccionar contratista' },
      { status: 500 }
    );
  }
}
