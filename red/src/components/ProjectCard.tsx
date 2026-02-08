import Link from 'next/link';
import CurrencyDisplay from './CurrencyDisplay';

interface ProjectCardProps {
  project: {
    id: number;
    title: string;
    description: string;
    category: string;
    suggested_category_name?: string | null;
    budget: string;
    budget_currency?: string;
    skills_required: string[];
    created_at: string;
    employer_name?: string;
    status: string;
  };
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

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <Link href={`/projects/${project.id}`} className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1">
            {project.title}
          </h3>
        </Link>
        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 shrink-0">
          {project.status}
        </span>
      </div>

      <p className="text-gray-600 text-sm line-clamp-3 mb-4">
        {project.description}
      </p>

      <div className="flex items-center gap-3 mb-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {project.category === 'Otro' && project.suggested_category_name
            ? `Otro (${project.suggested_category_name})`
            : project.category}
        </span>
        <CurrencyDisplay
          amount={parseFloat(project.budget)}
          currency={(project.budget_currency as 'COP' | 'USD') || 'COP'}
        />
      </div>

      {project.skills_required && project.skills_required.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {project.skills_required.slice(0, 5).map((skill: string) => (
            <span
              key={skill}
              className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
            >
              {skill}
            </span>
          ))}
          {project.skills_required.length > 5 && (
            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
              +{project.skills_required.length - 5} más
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          {project.employer_name && <span>Por {project.employer_name} · </span>}
          {timeAgo(project.created_at)}
        </div>
        <Link
          href={`/projects/${project.id}`}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Ver proyecto →
        </Link>
      </div>
    </div>
  );
}
