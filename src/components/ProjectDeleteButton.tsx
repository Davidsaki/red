'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ProjectDeleteButtonProps {
  projectId: number;
}

export default function ProjectDeleteButton({ projectId }: ProjectDeleteButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleDelete(): Promise<void> {
    if (!confirm('¿Estás seguro de que quieres eliminar este proyecto? Esta acción no se puede deshacer.')) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Error al eliminar el proyecto');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      alert('Error al eliminar el proyecto');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isLoading}
      className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isLoading ? 'Eliminando...' : 'Eliminar'}
    </button>
  );
}
