import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { sql, pool } from '@/lib/db';
import Link from 'next/link';
import AdminCategoryActions from '@/components/AdminCategoryActions';

export default async function AdminCategoriesPage() {
  const session = await getSession();

  if (!session?.user?.email) {
    redirect('/login');
  }

  // Check admin role
  const userResult = await sql`
    SELECT role FROM users WHERE email = ${session.user.email}
  `;

  if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
    redirect('/dashboard');
  }

  // Fetch all categories with skills
  const categoriesResult = await pool.query(`
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

  // Gather project info for pending categories
  const pendingWithProject = categoriesResult.rows.filter(
    (c: any) => c.status === 'pending' && c.related_project_id
  );
  const pendingWithoutProject = categoriesResult.rows.filter(
    (c: any) => c.status === 'pending' && !c.related_project_id && c.suggested_by
  );

  const projectIds = pendingWithProject.map((c: any) => c.related_project_id);
  const projectsMap: Record<number, any> = {};

  if (projectIds.length > 0) {
    const projectsResult = await pool.query(
      `SELECT p.id, p.title, p.description, p.category, p.budget, p.budget_currency,
              p.skills_required, p.status, p.created_at, u.name as employer_name
       FROM projects p JOIN users u ON p.employer_id = u.id
       WHERE p.id = ANY($1)`,
      [projectIds]
    );
    for (const p of projectsResult.rows) {
      projectsMap[p.id] = p;
    }
  }

  // Try fallback: find "Otro" projects by the suggesting user
  for (const cat of pendingWithoutProject) {
    const projectResult = await pool.query(
      `SELECT p.id, p.title, p.description, p.category, p.budget, p.budget_currency,
              p.skills_required, p.status, p.created_at, u.name as employer_name
       FROM projects p JOIN users u ON p.employer_id = u.id
       WHERE p.employer_id = $1 AND p.category = 'Otro'
       ORDER BY p.created_at DESC LIMIT 1`,
      [cat.suggested_by]
    );
    if (projectResult.rows.length > 0) {
      const proj = projectResult.rows[0];
      projectsMap[proj.id] = proj;
      cat.related_project_id = proj.id;
    }
  }

  // Attach project data + get approved categories list for reassign
  const approvedCategories = categoriesResult.rows
    .filter((c: any) => c.status === 'approved')
    .map((c: any) => ({ id: c.id, name: c.name }));

  const categoriesWithProjects = categoriesResult.rows.map((cat: any) => ({
    ...cat,
    related_project: cat.related_project_id ? projectsMap[cat.related_project_id] || null : null,
  }));

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Categorías</h1>
            <p className="text-gray-600 mt-1">Panel de administración</p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Volver al Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <AdminCategoryActions
            categories={categoriesWithProjects}
            approvedCategories={approvedCategories}
          />
        </div>
      </div>
    </div>
  );
}
