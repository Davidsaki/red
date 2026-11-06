'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from './Modal';

export interface FinishedApplication {
  id: number;
  freelancerName: string | null;
}

interface ProjectExecutionActionsProps {
  projectId: number;
  onFinished?: (application: FinishedApplication) => void;
}

type Action = 'complete' | 'reopen';

const COPY: Record<Action, { title: string; body: string; confirm: string; loading: string }> = {
  complete: {
    title: 'Marcar como completado',
    body: 'El proyecto pasará a Completado y el trabajo del contratista seleccionado quedará registrado como finalizado.',
    confirm: 'Marcar como completado',
    loading: 'Guardando...',
  },
  reopen: {
    title: 'Reabrir para buscar otro contratista',
    body: 'La participación del contratista actual terminará (su aplicación quedará como Trabajo finalizado y no podrá ser seleccionado de nuevo en este proyecto). El proyecto volverá a estar Abierto y las demás aplicaciones seguirán disponibles para seleccionar.',
    confirm: 'Reabrir proyecto',
    loading: 'Reabriendo...',
  },
};

export default function ProjectExecutionActions({ projectId, onFinished }: ProjectExecutionActionsProps) {
  const router = useRouter();
  const [action, setAction] = useState<Action | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close(): void {
    setAction(null);
    setError(null);
  }

  async function handleConfirm(): Promise<void> {
    if (!action) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/${action}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Error al actualizar el proyecto');
        return;
      }
      setAction(null);
      if (data.finishedApplication) onFinished?.(data.finishedApplication);
      router.refresh();
    } catch {
      setError('Error al actualizar el proyecto');
    } finally {
      setIsLoading(false);
    }
  }

  const copy = action ? COPY[action] : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setAction('complete')}
        className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-xl transition-colors"
      >
        Marcar como completado
      </button>
      <button
        type="button"
        onClick={() => setAction('reopen')}
        className="px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded-xl transition-colors"
      >
        Reabrir para buscar otro contratista
      </button>

      <Modal isOpen={action !== null} onClose={close} title={copy?.title ?? ''}>
        {copy && (
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <p className="text-sm text-gray-600">{copy.body}</p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isLoading}
                className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? copy.loading : copy.confirm}
              </button>
              <button
                type="button"
                onClick={close}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
