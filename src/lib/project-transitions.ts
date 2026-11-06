import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql, pool } from '@/lib/db';

type FinishTarget = 'completed' | 'open';

export async function finishProjectExecution(
  rawId: string,
  target: FinishTarget
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(rawId, 10);
    if (isNaN(projectId)) {
      return NextResponse.json({ success: false, error: 'ID de proyecto inválido' }, { status: 400 });
    }

    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    if (userResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    const userId = userResult.rows[0].id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const projectResult = await client.query(
        'SELECT employer_id, status FROM projects WHERE id = $1 FOR UPDATE',
        [projectId]
      );
      if (projectResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'Proyecto no encontrado' }, { status: 404 });
      }
      const project = projectResult.rows[0];
      if (project.employer_id !== userId) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'No tienes permiso para modificar este proyecto' },
          { status: 403 }
        );
      }
      if (project.status !== 'in_progress') {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'El proyecto no está en ejecución' },
          { status: 409 }
        );
      }

      const finished = await client.query(
        `UPDATE applications SET status = 'finished', finished_at = NOW()
         WHERE project_id = $1 AND status = 'accepted'
         RETURNING id, freelancer_id`,
        [projectId]
      );
      let finishedApplication: { id: number; freelancerName: string | null } | null = null;
      if (finished.rows.length > 0) {
        const nameResult = await client.query('SELECT name FROM users WHERE id = $1', [
          finished.rows[0].freelancer_id,
        ]);
        finishedApplication = {
          id: finished.rows[0].id,
          freelancerName: nameResult.rows[0]?.name ?? null,
        };
      }
      const updated = await client.query(
        'UPDATE projects SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
        [projectId, target]
      );

      await client.query('COMMIT');
      return NextResponse.json({ success: true, project: updated.rows[0], finishedApplication });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error finishing project execution:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar el proyecto' },
      { status: 500 }
    );
  }
}
