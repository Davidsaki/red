// src/app/api/admin/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql, pool } from '@/lib/db';

async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return false;

  const result = await sql`
    SELECT role FROM users WHERE email = ${session.user.email}
  `;
  return result.rows.length > 0 && result.rows[0].role === 'admin';
}

// GET: Admin - list all categories including pending, with related project info
export async function GET(): Promise<NextResponse> {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const result = await pool.query(`
      SELECT c.*, u.name as suggested_by_name, u.email as suggested_by_email,
        c.related_project_id,
        COALESCE(
          json_agg(
            json_build_object('id', cs.id, 'name', cs.name)
          ) FILTER (WHERE cs.id IS NOT NULL),
          '[]'
        ) as skills
      FROM categories c
      LEFT JOIN users u ON c.suggested_by = u.id
      LEFT JOIN category_skills cs ON cs.category_id = c.id
      GROUP BY c.id, c.name, c.slug, c.status, c.suggested_by, c.created_at,
               c.related_project_id, u.name, u.email
      ORDER BY c.status DESC, c.created_at DESC
    `);

    // For pending categories with a related project, fetch project details
    const pendingWithProject = result.rows.filter(
      (c: any) => c.status === 'pending' && c.related_project_id
    );

    const projectIds = pendingWithProject.map((c: any) => c.related_project_id);
    let projectsMap: Record<number, any> = {};

    if (projectIds.length > 0) {
      const projectsResult = await pool.query(
        `SELECT p.id, p.title, p.description, p.category, p.budget, p.budget_currency,
                p.skills_required, p.status, p.created_at,
                u.name as employer_name
         FROM projects p
         JOIN users u ON p.employer_id = u.id
         WHERE p.id = ANY($1)`,
        [projectIds]
      );
      for (const p of projectsResult.rows) {
        projectsMap[p.id] = p;
      }
    }

    // Also try to find projects by users who suggested categories but didn't link them
    // (for suggestions made before the linking feature)
    const pendingWithoutProject = result.rows.filter(
      (c: any) => c.status === 'pending' && !c.related_project_id && c.suggested_by
    );

    for (const cat of pendingWithoutProject) {
      const projectResult = await pool.query(
        `SELECT p.id, p.title, p.description, p.category, p.budget, p.budget_currency,
                p.skills_required, p.status, p.created_at,
                u.name as employer_name
         FROM projects p
         JOIN users u ON p.employer_id = u.id
         WHERE p.employer_id = $1 AND p.category = 'Otro'
         ORDER BY p.created_at DESC
         LIMIT 1`,
        [cat.suggested_by]
      );
      if (projectResult.rows.length > 0) {
        const proj = projectResult.rows[0];
        projectsMap[proj.id] = proj;
        cat.related_project_id = proj.id;
      }
    }

    // Attach project data to categories
    const categoriesWithProjects = result.rows.map((cat: any) => ({
      ...cat,
      related_project: cat.related_project_id
        ? projectsMap[cat.related_project_id] || null
        : null,
    }));

    return NextResponse.json({ success: true, categories: categoriesWithProjects });
  } catch (error) {
    console.error('Error fetching admin categories:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener categorías' },
      { status: 500 }
    );
  }
}

// PATCH: Admin - approve or reassign
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, action, existingCategoryId, newName, approvedSkills } = body;

    if (!id || !action) {
      return NextResponse.json(
        { error: 'ID y acción son requeridos' },
        { status: 400 }
      );
    }

    // Get the pending category info
    const catResult = await pool.query(
      'SELECT * FROM categories WHERE id = $1',
      [id]
    );
    if (catResult.rows.length === 0) {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
    }
    const pendingCat = catResult.rows[0];

    if (action === 'approve') {
      // If admin provided a new name, update name and slug before approving
      let finalName = pendingCat.name;
      if (newName && typeof newName === 'string' && newName.trim().length >= 2) {
        finalName = newName.trim();
        const newSlug = finalName
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        // Check slug conflict
        const conflict = await pool.query(
          'SELECT id FROM categories WHERE slug = $1 AND id != $2',
          [newSlug, id]
        );
        if (conflict.rows.length > 0) {
          return NextResponse.json(
            { success: false, error: `Ya existe una categoría con un nombre similar a "${finalName}"` },
            { status: 409 }
          );
        }

        await pool.query(
          "UPDATE categories SET name = $1, slug = $2, status = 'approved' WHERE id = $3",
          [finalName, newSlug, id]
        );
      } else {
        // Approve with existing name
        await pool.query(
          "UPDATE categories SET status = 'approved' WHERE id = $1",
          [id]
        );
      }

      // Build the clean skills list from approved skills
      const cleanSkills = Array.isArray(approvedSkills)
        ? approvedSkills.filter((s: unknown) => typeof s === 'string' && (s as string).trim()).map((s: string) => s.trim())
        : [];

      // If there's a related project, update its category, skills, and clear suggested_category_name
      if (pendingCat.related_project_id) {
        await pool.query(
          'UPDATE projects SET category = $1, suggested_category_name = NULL, skills_required = $3::text[], updated_at = NOW() WHERE id = $2',
          [finalName, pendingCat.related_project_id, cleanSkills]
        );
      }

      // Promote approved skills to category_skills
      for (const skillName of cleanSkills) {
        await pool.query(
          'INSERT INTO category_skills (category_id, name) VALUES ($1, $2) ON CONFLICT (category_id, name) DO NOTHING',
          [id, skillName]
        );
      }

      return NextResponse.json({
        success: true,
        message: `Categoría "${finalName}" aprobada${pendingCat.related_project_id ? ' y asignada al proyecto' : ''}`,
      });
    }

    if (action === 'reassign') {
      // Map the project to an existing category instead
      if (!existingCategoryId) {
        return NextResponse.json(
          { error: 'Se requiere la categoría existente para reasignar' },
          { status: 400 }
        );
      }

      // Get the existing category name
      const existingCat = await pool.query(
        'SELECT name FROM categories WHERE id = $1',
        [existingCategoryId]
      );
      if (existingCat.rows.length === 0) {
        return NextResponse.json({ error: 'Categoría existente no encontrada' }, { status: 404 });
      }

      const existingCatName = existingCat.rows[0].name;

      // Build the clean skills list from approved skills
      const cleanSkills = Array.isArray(approvedSkills)
        ? approvedSkills.filter((s: unknown) => typeof s === 'string' && (s as string).trim()).map((s: string) => s.trim())
        : [];

      // Get existing category skills to merge with approved ones for the project
      const existingSkillsResult = await pool.query(
        'SELECT name FROM category_skills WHERE category_id = $1',
        [existingCategoryId]
      );
      const existingSkillNames = new Set(existingSkillsResult.rows.map((r: any) => r.name));
      const mergedProjectSkills = [...existingSkillNames, ...cleanSkills.filter((s: string) => !existingSkillNames.has(s))];

      // Update the project's category, skills, and clear suggested_category_name
      if (pendingCat.related_project_id) {
        await pool.query(
          'UPDATE projects SET category = $1, suggested_category_name = NULL, skills_required = $3::text[], updated_at = NOW() WHERE id = $2',
          [existingCatName, pendingCat.related_project_id, mergedProjectSkills]
        );
      }

      // Add selected skills to the existing category (duplicates ignored by ON CONFLICT)
      for (const skillName of cleanSkills) {
        await pool.query(
          'INSERT INTO category_skills (category_id, name) VALUES ($1, $2) ON CONFLICT (category_id, name) DO NOTHING',
          [existingCategoryId, skillName]
        );
      }

      // Delete the pending suggestion
      await pool.query('DELETE FROM categories WHERE id = $1', [id]);

      return NextResponse.json({
        success: true,
        message: `Proyecto reasignado a "${existingCatName}" y sugerencia eliminada`,
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar categoría' },
      { status: 500 }
    );
  }
}

// DELETE: Admin - reject/delete a category suggestion
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID es requerido' },
        { status: 400 }
      );
    }

    await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'Categoría eliminada' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar categoría' },
      { status: 500 }
    );
  }
}
