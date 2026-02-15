'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ProjectCloseButtonProps {
  projectId: number;
}

export default function ProjectCloseButton({ projectId }: ProjectCloseButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleClose(): Promise<void> {
    if (!confirm('¿Estás seguro de que quieres cerrar este proyecto? Ya no aceptará nuevas aplicaciones.')) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Error al cerrar el proyecto');
        return;
      }

      router.refresh();
    } catch {
      alert('Error al cerrar el proyecto');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClose}
      disabled={isLoading}
      className="px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isLoading ? 'Cerrando...' : 'Cerrar'}
    </button>
  );
}
