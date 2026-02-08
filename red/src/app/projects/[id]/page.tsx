import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CurrencyDisplay from '@/components/CurrencyDisplay';

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              RED
            </Link>
            <nav className="flex items-center space-x-4">
              <Link
                href="/projects"
                className="text-gray-700 hover:text-blue-600"
              >
                Proyectos
              </Link>
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-blue-600"
              >
                Dashboard
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          href="/projects"
          className="text-blue-600 hover:text-blue-800 text-sm mb-4 inline-block"
        >
          ← Volver a proyectos
        </Link>

        <div className="bg-white rounded-lg shadow p-6 md:p-8">
          {/* Title & Status */}
          <div className="flex items-start justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 shrink-0 ml-4">
              {project.status}
            </span>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 mb-6 pb-6 border-b border-gray-200">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {project.category === 'Otro' && project.suggested_category_name
                ? `Otro (${project.suggested_category_name})`
                : project.category}
            </span>
            <CurrencyDisplay
              amount={parseFloat(project.budget)}
              currency={project.budget_currency || 'COP'}
            />
            <span className="text-sm text-gray-500">
              Publicado {timeAgo(project.created_at)}
            </span>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Descripción</h2>
            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {project.description}
            </div>
          </div>

          {/* Skills */}
          {project.skills_required && project.skills_required.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Habilidades Requeridas</h2>
              <div className="flex flex-wrap gap-2">
                {project.skills_required.map((skill: string) => (
                  <span
                    key={skill}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Employer */}
          <div className="mb-6 pb-6 border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Publicado por</h2>
            <div className="flex items-center gap-3">
              {project.employer_image && (
                <img
                  src={project.employer_image}
                  alt={project.employer_name}
                  className="w-10 h-10 rounded-full"
                />
              )}
              <div>
                <p className="font-medium text-gray-900">{project.employer_name}</p>
              </div>
            </div>
          </div>

          {/* Apply Button */}
          {isAuthenticated && !isOwner && project.status === 'open' && (
            <div className="pt-4 border-t border-gray-200">
              <Link
                href={`/dashboard/applications?projectId=${project.id}`}
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                Aplicar a este Proyecto
              </Link>
            </div>
          )}

          {!isAuthenticated && project.status === 'open' && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-gray-600 mb-3">Inicia sesión para aplicar a este proyecto.</p>
              <Link
                href="/login"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                Iniciar Sesión
              </Link>
            </div>
          )}

          {isOwner && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">Este es tu proyecto.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
