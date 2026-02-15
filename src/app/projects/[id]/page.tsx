import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CurrencyDisplay from '@/components/CurrencyDisplay';
import ProjectActions from '@/components/ProjectActions';

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) return `hace ${Math.floor(diffDays / 30)} mes(es)`;
  if (diffDays > 0) return `hace ${diffDays} día(s)`;
  if (diffHours > 0) return `hace ${diffHours} hora(s)`;
  if (diffMins > 0) return `hace ${diffMins} minuto(s)`;
  return 'ahora mismo';
}

const statusConfig: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  open: { label: 'Abierto', dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700' },
  closed: { label: 'Cerrado', dot: 'bg-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  completed: { label: 'Completado', dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  cancelled: { label: 'Cancelado', dot: 'bg-gray-400', bg: 'bg-gray-50', text: 'text-gray-600' },
};

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;
  const projectId = parseInt(id, 10);

  if (isNaN(projectId)) {
    notFound();
  }

  const result = await sql`
    SELECT p.*, u.name as employer_name, u.email as employer_email, u.image as employer_image
    FROM projects p
    JOIN users u ON p.employer_id = u.id
    WHERE p.id = ${projectId}
  `;

  if (result.rows.length === 0) {
    notFound();
  }

  const project = result.rows[0];
  const session = await getSession();
  const isOwner = session?.user?.id === project.employer_id?.toString();
  const isAuthenticated = !!session?.user;

  // Check if user already applied and fetch their application
  let hasApplied = false;
  let userApplication: { id: number; proposal: string; bid: string | null; status: string; created_at: string } | null = null;
  if (isAuthenticated) {
    const userResult = await sql`SELECT id FROM users WHERE email = ${session!.user.email}`;
    if (userResult.rows.length > 0) {
      const appResult = await sql`
        SELECT id, proposal, bid, status, created_at FROM applications
        WHERE project_id = ${projectId} AND freelancer_id = ${userResult.rows[0].id}
      `;
      if (appResult.rows.length > 0) {
        hasApplied = true;
        userApplication = appResult.rows[0];
      }
    }
  }

  // If owner, fetch applications for this project
  let applications: any[] = [];
  if (isOwner) {
    const appResult = await sql`
      SELECT a.*, u.name as freelancer_name, u.email as freelancer_email, u.image as freelancer_image
      FROM applications a
      JOIN users u ON a.freelancer_id = u.id
      WHERE a.project_id = ${projectId}
      ORDER BY a.created_at DESC
    `;
    applications = appResult.rows;
  }

  const status = statusConfig[project.status] || statusConfig.open;

  return (
    <div className="min-h-screen bg-gray-50/80">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-14">
            <Link href="/" className="text-xl font-bold text-gray-900">
              RED
            </Link>
            <nav className="flex items-center gap-1">
              <Link href="/projects" className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                Proyectos
              </Link>
              <Link href="/dashboard" className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                Dashboard
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* Back link */}
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Proyectos
        </Link>

        {/* Main card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 sm:p-7">
            {/* Status + Time */}
            <div className="flex items-center gap-3 mb-4">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${status.bg} ${status.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
              <span className="text-xs text-gray-400">
                {timeAgo(project.created_at)}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight mb-4">
              {project.title}
            </h1>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
                {project.category === 'Otro' && project.suggested_category_name
                  ? `Otro (${project.suggested_category_name})`
                  : project.category}
              </span>
              <CurrencyDisplay
                amount={parseFloat(project.budget)}
                currency={project.budget_currency || 'COP'}
              />
            </div>

            {/* Description */}
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Descripción</h2>
              <div className="text-gray-700 text-[15px] whitespace-pre-wrap leading-relaxed">
                {project.description}
              </div>
            </div>

            {/* Skills */}
            {project.skills_required && project.skills_required.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Habilidades</h2>
                <div className="flex flex-wrap gap-1.5">
                  {project.skills_required.map((skill: string) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 text-xs font-medium bg-gray-50 text-gray-600 rounded-lg border border-gray-100"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Employer */}
            <div className="pt-5 border-t border-gray-100">
              <div className="flex items-center gap-3">
                {project.employer_image ? (
                  <img
                    src={project.employer_image}
                    alt={project.employer_name}
                    className="w-9 h-9 rounded-full ring-2 ring-gray-100"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium">
                    {project.employer_name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">{project.employer_name}</p>
                  <p className="text-xs text-gray-400">Publicado por</p>
                </div>
              </div>
            </div>

            {/* Actions (apply, edit, close, delete) */}
            <ProjectActions
              project={project}
              isOwner={isOwner}
              isAuthenticated={isAuthenticated}
              hasApplied={hasApplied}
              userApplication={userApplication}
            />
          </div>
        </div>

        {/* Applications section - only for owner */}
        {isOwner && (
          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 sm:px-7 py-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Aplicaciones
                </h2>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                  {applications.length}
                </span>
              </div>

              {applications.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Aún no hay aplicaciones.</p>
              ) : (
                <div className="space-y-3">
                  {applications.map((app: any) => (
                    <div key={app.id} className="p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          {app.freelancer_image ? (
                            <img src={app.freelancer_image} alt={app.freelancer_name} className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-500">
                              {app.freelancer_name?.charAt(0)?.toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{app.freelancer_name}</p>
                            <p className="text-xs text-gray-400">{app.freelancer_email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {app.bid && (
                            <CurrencyDisplay
                              amount={parseFloat(app.bid)}
                              currency={project.budget_currency || 'COP'}
                            />
                          )}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                            app.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                            app.status === 'accepted' ? 'bg-green-50 text-green-700' :
                            'bg-red-50 text-red-700'
                          }`}>
                            {app.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{app.proposal}</p>
                      <p className="text-xs text-gray-400 mt-2">{timeAgo(app.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
