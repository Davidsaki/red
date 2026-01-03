// src/app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql } from '@/lib/db';
import { projectSchema } from '@/lib/validations';

// Get all projects or user's projects
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const status = searchParams.get('status') || 'open';

    let result;
    if (userId) {
      // Get projects by specific user
      result = await sql`
        SELECT p.*, u.name as employer_name, u.email as employer_email
        FROM projects p
        JOIN users u ON p.employer_id = u.id
        WHERE p.employer_id = ${userId}
        ORDER BY p.created_at DESC
      `;
    } else {
      // Get all open projects
      result = await sql`
        SELECT p.*, u.name as employer_name, u.email as employer_email
        FROM projects p
        JOIN users u ON p.employer_id = u.id
        WHERE p.status = ${status}
        ORDER BY p.created_at DESC
      `;
    }

    return NextResponse.json({
      success: true,
      projects: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch projects' },
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

    // Check project limit based on subscription
    const projectCount = await sql`
      SELECT COUNT(*) as count FROM projects WHERE employer_id = ${user.id}
    `;

    const maxProjects = user.subscription_tier === 'premium' ? 15 : 3;
    if (parseInt(projectCount.rows[0].count) >= maxProjects) {
      return NextResponse.json(
        {
          success: false,
          error: `You have reached the maximum number of projects (${maxProjects}). Upgrade to premium for more projects.`,
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = projectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.format() },
        { status: 400 }
      );
    }

    const { title, description, category, budget, skills_required } = validation.data;

    // Create project (convert array to PostgreSQL format)
    const skillsArray = `{${skills_required.map(s => `"${s.replace(/"/g, '\\"')}"`).join(',')}}`;

    const result = await sql`
      INSERT INTO projects (
        title,
        description,
        category,
        budget,
        employer_id,
        skills_required,
        status
      )
      VALUES (
        ${title},
        ${description},
        ${category},
        ${budget},
        ${user.id},
        ${skillsArray}::text[],
        'open'
      )
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      project: result.rows[0],
      message: 'Project created successfully',
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
