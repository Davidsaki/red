import { pool } from '@/lib/db';
import Link from 'next/link';
import ProjectCard from '@/components/ProjectCard';
import ProjectFilters from '@/components/ProjectFilters';
import Pagination from '@/components/Pagination';
import Header from '@/components/Header';
import { Suspense } from 'react';

interface ProjectsPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

async function getCategories() {
  const result = await pool.query(`
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
  return result.rows;
}

async function getProjects(params: { [key: string]: string | undefined }) {
  const { search, category, budgetMin, budgetMax, skills, page = '1' } = params;
  const limit = 12;
  const offset = (parseInt(page, 10) - 1) * limit;

  const conditions: string[] = ["p.status = 'open'"];
  const queryParams: any[] = [];
  let paramIndex = 1;

  if (search) {
    conditions.push(`(p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
    queryParams.push(`%${search}%`);
    paramIndex++;
  }

  if (category) {
    conditions.push(`p.category = $${paramIndex++}`);
    queryParams.push(category);
  }

  if (budgetMin) {
    conditions.push(`p.budget >= $${paramIndex++}`);
    queryParams.push(parseFloat(budgetMin));
  }

  if (budgetMax) {
    conditions.push(`p.budget <= $${paramIndex++}`);
    queryParams.push(parseFloat(budgetMax));
  }

  if (skills) {
    const skillsArr = skills.split(',').map((s) => s.trim()).filter(Boolean);
    if (skillsArr.length > 0) {
      conditions.push(`p.skills_required && $${paramIndex++}::text[]`);
      queryParams.push(skillsArr);
    }
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM projects p ${whereClause}`,
    queryParams
  );
  const totalCount = parseInt(countResult.rows[0].total, 10);
  const totalPages = Math.ceil(totalCount / limit);

  const result = await pool.query(
    `SELECT p.*, u.name as employer_name,
            (SELECT COUNT(*)::int FROM applications a WHERE a.project_id = p.id) as application_count
     FROM projects p
     JOIN users u ON p.employer_id = u.id
     ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...queryParams, limit, offset]
  );

  return {
    projects: result.rows,
    totalCount,
    totalPages,
    currentPage: parseInt(page, 10),
  };
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const params = await searchParams;
  const [categories, { projects, totalCount, totalPages, currentPage }] = await Promise.all([
    getCategories(),
    getProjects(params),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Proyectos Disponibles</h1>
          <p className="text-gray-600 mt-1">
            {totalCount} proyecto{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <aside className="w-full lg:w-72 shrink-0">
            <div className="bg-white rounded-lg shadow p-5 sticky top-[72px]">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h2>
              <Suspense fallback={<div>Cargando filtros...</div>}>
                <ProjectFilters categories={categories} />
              </Suspense>
            </div>
          </aside>

          {/* Projects Grid */}
          <main className="flex-1">
            {projects.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg shadow">
                <p className="text-gray-500 text-lg mb-2">No se encontraron proyectos</p>
                <p className="text-gray-400 text-sm">Intenta con otros filtros o términos de búsqueda</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {projects.map((project: any) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}

            <Suspense fallback={null}>
              <Pagination currentPage={currentPage} totalPages={totalPages} />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}
