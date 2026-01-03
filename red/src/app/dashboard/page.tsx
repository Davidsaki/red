import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Get user ID from database
  const userResult = await sql`
    SELECT id, subscription_tier FROM users WHERE email = ${session.user.email}
  `;

  const userId = userResult.rows[0]?.id;
  const subscriptionTier = userResult.rows[0]?.subscription_tier || 'free';

  // Fetch user's projects
  let projects: any[] = [];
  if (userId) {
    const projectsResult = await sql`
      SELECT * FROM projects
      WHERE employer_id = ${userId}
      ORDER BY created_at DESC
    `;
    projects = projectsResult.rows;
  }

  // Calculate limits
  const maxProjects = subscriptionTier === 'premium' ? 15 : 3;
  const projectCount = projects.length;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* User Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {session.user?.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="w-16 h-16 rounded-full"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Bienvenido, {session.user?.name}!
                </h1>
                <p className="text-gray-600">{session.user?.email}</p>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-sm text-blue-600 font-medium">
                    Plan: {subscriptionTier}
                  </p>
                  <p className="text-sm text-gray-500">
                    Proyectos: {projectCount}/{maxProjects}
                  </p>
                </div>
              </div>
            </div>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>

        {/* Projects Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Mis Proyectos ({projectCount})
            </h2>
            <Link
              href="/dashboard/projects/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              + Publicar Proyecto
            </Link>
          </div>

          {projectCount >= maxProjects && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-yellow-800 text-sm">
                Has alcanzado el límite de {maxProjects} proyectos.
                {subscriptionTier === 'free' && ' Mejora a premium para publicar hasta 15 proyectos.'}
              </p>
            </div>
          )}

          {projects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No tienes proyectos publicados aún.</p>
              <Link
                href="/dashboard/projects/new"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Publicar tu Primer Proyecto
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project: any) => (
                <div
                  key={project.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {project.title}
                      </h3>
                      <p className="text-gray-600 mt-1 line-clamp-2">
                        {project.description}
                      </p>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {project.status}
                        </span>
                        <span className="text-sm text-gray-500">
                          {project.category}
                        </span>
                        <span className="text-sm font-semibold text-blue-600">
                          ${parseFloat(project.budget).toFixed(2)} USD
                        </span>
                      </div>
                      {project.skills_required && project.skills_required.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {project.skills_required.map((skill: string) => (
                            <span
                              key={skill}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 ml-4">
                      {new Date(project.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Applications Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Mis Aplicaciones
          </h2>
          <p className="text-gray-600">No has aplicado a ningún proyecto.</p>
          <Link
            href="/projects"
            className="inline-block mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Buscar Proyectos
          </Link>
        </div>
      </div>
    </div>
  );
}