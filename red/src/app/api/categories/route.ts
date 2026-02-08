// src/app/api/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql, pool } from '@/lib/db';

// GET: Public - returns approved categories with their skills + user's pending suggestions
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const categoriesResult = await pool.query(`
      SELECT c.id, c.name, c.slug,
        COALESCE(
          json_agg(
            json_build_object('id', cs.id, 'name', cs.name)
          ) FILTER (WHERE cs.id IS NOT NULL),
          '[]'
        ) as skills
      FROM categories c
      LEFT JOIN category_skills cs ON cs.category_id = c.id
      WHERE c.status = 'approved'
      GROUP BY c.id, c.name, c.slug
      ORDER BY c.name ASC
    `);

    // If authenticated, also return user's pending suggestions
    let mySuggestions: any[] = [];
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const userResult = await sql`
        SELECT id FROM users WHERE email = ${session.user.email}
      `;
      if (userResult.rows.length > 0) {
        const userId = userResult.rows[0].id;
        const suggestionsResult = await pool.query(
          "SELECT id, name, slug, status, created_at FROM categories WHERE suggested_by = $1 AND status = 'pending' ORDER BY created_at DESC",
          [userId]
        );
        mySuggestions = suggestionsResult.rows;
      }
    }

    return NextResponse.json({
      success: true,
      categories: categoriesResult.rows,
      mySuggestions,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener categorías' },
      { status: 500 }
    );
  }
}

// POST: Authenticated - suggest a new category
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userResult = await sql`
      SELECT id FROM users WHERE email = ${session.user.email}
    `;
    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const userId = userResult.rows[0].id;
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Nombre de categoría inválido' },
        { status: 400 }
      );
    }

    // Sanitize: collapse whitespace, strip non-letter/number/space chars, Title Case
    const sanitized = name
      .trim()
      .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s\-\/]/g, '') // keep letters, accents, numbers, spaces, hyphens, slashes
      .replace(/\s+/g, ' ')                                  // collapse multiple spaces
      .trim();

    if (sanitized.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Nombre de categoría inválido después de formatear' },
        { status: 400 }
      );
    }

    // Title Case: capitalize first letter of each word
    const trimmedName = sanitized
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    const slug = trimmedName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if category already exists
    const existing = await pool.query(
      'SELECT id FROM categories WHERE slug = $1',
      [slug]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Ya existe una categoría similar' },
        { status: 409 }
      );
    }

    const result = await pool.query(
      "INSERT INTO categories (name, slug, status, suggested_by) VALUES ($1, $2, 'pending', $3) RETURNING *",
      [trimmedName, slug, userId]
    );

    return NextResponse.json({
      success: true,
      category: result.rows[0],
      message: 'Categoría sugerida. Un administrador la revisará pronto.',
    });
  } catch (error) {
    console.error('Error suggesting category:', error);
    return NextResponse.json(
      { success: false, error: 'Error al sugerir categoría' },
      { status: 500 }
    );
  }
}

// PUT: Authenticated - edit own pending suggestion
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    if (userResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    const userId = userResult.rows[0].id;
    const body = await request.json();
    const { id, name } = body;

    if (!id || !name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Datos inválidos' }, { status: 400 });
    }

    // Verify ownership and pending status
    const existing = await pool.query(
      "SELECT id FROM categories WHERE id = $1 AND suggested_by = $2 AND status = 'pending'",
      [id, userId]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Sugerencia no encontrada o ya aprobada' }, { status: 404 });
    }

    const trimmedName = name.trim();
    const slug = trimmedName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check slug conflict with other categories
    const conflict = await pool.query(
      'SELECT id FROM categories WHERE slug = $1 AND id != $2',
      [slug, id]
    );
    if (conflict.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'Ya existe una categoría similar' }, { status: 409 });
    }

    await pool.query(
      'UPDATE categories SET name = $1, slug = $2 WHERE id = $3',
      [trimmedName, slug, id]
    );

    return NextResponse.json({ success: true, message: 'Sugerencia actualizada' });
  } catch (error) {
    console.error('Error updating suggestion:', error);
    return NextResponse.json({ success: false, error: 'Error al actualizar sugerencia' }, { status: 500 });
  }
}

// DELETE: Authenticated - cancel own pending suggestion
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    if (userResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    const userId = userResult.rows[0].id;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 });
    }

    await pool.query(
      "DELETE FROM categories WHERE id = $1 AND suggested_by = $2 AND status = 'pending'",
      [id, userId]
    );

    return NextResponse.json({ success: true, message: 'Sugerencia eliminada' });
  } catch (error) {
    console.error('Error deleting suggestion:', error);
    return NextResponse.json({ success: false, error: 'Error al eliminar sugerencia' }, { status: 500 });
  }
}
