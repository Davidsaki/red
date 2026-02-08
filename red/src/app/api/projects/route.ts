// src/app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql, pool } from '@/lib/db';
import { projectSchema } from '@/lib/validations';

// Get all projects with search, filters, and pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const status = searchParams.get('status') || 'open';
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const budgetMin = searchParams.get('budgetMin');
    const budgetMax = searchParams.get('budgetMax');
    const skills = searchParams.get('skills');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '12', 10), 50);
    const offset = (page - 1) * limit;

    // Build dynamic query
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (userId) {
      conditions.push(`p.employer_id = $${paramIndex++}`);
      params.push(userId);
    } else {
      conditions.push(`p.status = $${paramIndex++}`);
      params.push(status);
    }

    if (search) {
      conditions.push(`(p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      conditions.push(`p.category = $${paramIndex++}`);
      params.push(category);
    }

    if (budgetMin) {
      conditions.push(`p.budget >= $${paramIndex++}`);
      params.push(parseFloat(budgetMin));
    }

    if (budgetMax) {
      conditions.push(`p.budget <= $${paramIndex++}`);
      params.push(parseFloat(budgetMax));
    }

    if (skills) {
      const skillsArr = skills.split(',').map((s) => s.trim());
      conditions.push(`p.skills_required && $${paramIndex++}::text[]`);
      params.push(skillsArr);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM projects p ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch projects with pagination
    const result = await pool.query(
      `SELECT p.*, u.name as employer_name, u.email as employer_email
       FROM projects p
       JOIN users u ON p.employer_id = u.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      success: true,
      projects: result.rows,
      count: result.rows.length,
      totalCount,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener proyectos' },
      { status: 500 }
    );
  }
}

// Create a new project
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user ID from database
    const userResult = await sql`
      SELECT id, subscription_tier FROM users WHERE email = ${session.user.email}
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // Project limits per subscription tier (currently unlimited for all tiers)
    // TODO: Enforce limits when premium plans launch
    // const projectCount = await sql`
    //   SELECT COUNT(*) as count FROM projects WHERE employer_id = ${user.id}
    // `;
    // const maxProjects = user.subscription_tier === 'premium' ? 100 : 10;
    // if (parseInt(projectCount.rows[0].count) >= maxProjects) {
    //   return NextResponse.json(
    //     { success: false, error: `Has alcanzado el límite de ${maxProjects} proyectos.` },
    //     { status: 403 }
    //   );
    // }

    // Parse and validate request body
    const body = await request.json();
    const suggestedCategoryId = body.suggested_category_id;
    const validation = projectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.format() },
        { status: 400 }
      );
    }

    const { title, description, category, budget, skills_required, budget_currency } = validation.data;

    // If there's a pending suggestion, get its name for display
    let suggestedCategoryName: string | null = null;
    if (suggestedCategoryId) {
      const sugCat = await pool.query(
        "SELECT name FROM categories WHERE id = $1 AND status = 'pending'",
        [suggestedCategoryId]
      );
      if (sugCat.rows.length > 0) {
        suggestedCategoryName = sugCat.rows[0].name;
      }
    }

    // Create project (convert array to PostgreSQL format)
    const skillsArray = `{${skills_required.map(s => `"${s.replace(/"/g, '\\"')}"`).join(',')}}`;
    const currency = budget_currency || 'COP';

    const result = await sql`
      INSERT INTO projects (
        title,
        description,
        category,
        budget,
        budget_currency,
        employer_id,
        skills_required,
        suggested_category_name,
        status
      )
      VALUES (
        ${title},
        ${description},
        ${category},
        ${budget},
        ${currency},
        ${user.id},
        ${skillsArray}::text[],
        ${suggestedCategoryName},
        'open'
      )
      RETURNING *
    `;

    const createdProject = result.rows[0];

    // Link pending category suggestion to this project and save suggested skills
    if (suggestedCategoryId) {
      await pool.query(
        `UPDATE categories
         SET related_project_id = $1, suggested_skills = $4::text[]
         WHERE id = $2 AND suggested_by = $3 AND status = 'pending'`,
        [createdProject.id, suggestedCategoryId, user.id, skills_required]
      );
    } else if (category === 'Otro') {
      // Fallback: if project is "Otro" and user has unlinked pending suggestions, link the most recent one
      await pool.query(
        `UPDATE categories SET related_project_id = $1, suggested_skills = $3::text[]
         WHERE id = (
           SELECT id FROM categories
           WHERE suggested_by = $2 AND status = 'pending' AND related_project_id IS NULL
           ORDER BY created_at DESC LIMIT 1
         )`,
        [createdProject.id, user.id, skills_required]
      );
    }

    return NextResponse.json({
      success: true,
      project: createdProject,
      message: 'Proyecto creado exitosamente',
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
