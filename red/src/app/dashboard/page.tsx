import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sql, pool } from "@/lib/db";
import Link from "next/link";
import CurrencyDisplay from "@/components/CurrencyDisplay";
import ProjectCarousel from "@/components/ProjectCarousel";
import DashboardSearch from "@/components/DashboardSearch";
import CollapsibleSection from "@/components/CollapsibleSection";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Fetch all data in parallel
  const [userResult, latestProjectsResult, categoriesResult] = await Promise.all([
    sql`SELECT id, subscription_tier, role FROM users WHERE email = ${session.user.email}`,
    pool.query(`
      SELECT p.*, u.name as employer_name
      FROM projects p
      LEFT JOIN users u ON p.employer_id = u.id
      WHERE p.status = 'open'
      ORDER BY p.created_at DESC
      LIMIT 12
    `),
    pool.query(`
      SELECT id, name, slug FROM categories
      WHERE status = 'approved'
      ORDER BY name ASC
    `),
  ]);

  const userId = userResult.rows[0]?.id;
  const userRole = userResult.rows[0]?.role || 'user';

  const latestProjects = latestProjectsResult.rows;
  const categories = categoriesResult.rows;

  // Fetch user-specific data (depends on userId)
  let projects: any[] = [];
  let applicationCount = 0;

  if (userId) {
    const [projectsResult, appCountResult] = await Promise.all([
      sql`SELECT * FROM projects WHERE employer_id = ${userId} ORDER BY created_at DESC`,
      sql`SELECT COUNT(*)::int as count FROM applications WHERE freelancer_id = ${userId}`,
    ]);
    projects = projectsResult.rows;
    applicationCount = appCountResult.rows[0]?.count || 0;
  }

  const projectCount = projects.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Compact Header */}
        <div className="bg-white rounded-lg shadow px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {session.user?.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="w-10 h-10 rounded-full"
                />
              )}
              <h1 className="text-lg font-semibold text-gray-900">
                Bienvenido, {session.user?.name}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/projects/new"
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                + Publicar
              </Link>
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Cerrar sesión"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Admin Panel Link */}
        {userRole === 'admin' && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <p className="text-sm font-medium text-purple-900">Panel de Administración</p>
            <Link
              href="/admin/categories"
              className="text-sm text-purple-700 hover:text-purple-900 font-medium"
            >
              Gestionar Categorías →
            </Link>
          </div>
        )}

        {/* Latest Projects Carousel */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Últimos Proyectos</h2>
            <Link
              href="/projects"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Ver todos →
            </Link>
          </div>
          <ProjectCarousel projects={latestProjects} />
        </div>

        {/* Discover / Search */}
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Descubre Proyectos</h2>
          <DashboardSearch categories={categories} />
        </div>

        {/* My Projects - Collapsible */}
        <CollapsibleSection
          title="Mis Proyectos"
          badge={projectCount}
          headerAction={
            <Link
              href="/dashboard/projects/new"
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              + Publicar
            </Link>
          }
        >
          {projects.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-3">No tienes proyectos publicados aún.</p>
              <Link
                href="/dashboard/projects/new"
                className="inline-block px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                Publicar tu Primer Proyecto
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project: any) => (
                <div
                  key={project.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{project.title}</h3>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {project.status}
                        </span>
                        <span className="text-sm text-gray-500">
                          {project.category === 'Otro' && project.suggested_category_name
                            ? `Otro (${project.suggested_category_name})`
                            : project.category}
                        </span>
                        <CurrencyDisplay
                          amount={parseFloat(project.budget)}
                          currency={project.budget_currency || 'COP'}
                        />
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 ml-4">
                      {new Date(project.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* My Applications - Collapsible */}
        <CollapsibleSection title="Mis Aplicaciones" badge={applicationCount}>
          {applicationCount === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-3">No has aplicado a ningún proyecto.</p>
              <Link
                href="/projects"
                className="inline-block px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
              >
                Buscar Proyectos
              </Link>
            </div>
          ) : (
            <p className="text-gray-600">Tienes {applicationCount} aplicación(es).</p>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
}
