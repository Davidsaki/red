'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from './Modal';

interface SelectContractorButtonProps {
  applicationId: number;
  contractorName: string;
}

export default function SelectContractorButton({ applicationId, contractorName }: SelectContractorButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailFailed, setEmailFailed] = useState(false);

  function close(): void {
    setIsOpen(false);
    setError(null);
    if (emailFailed) {
      setEmailFailed(false);
      router.refresh();
    }
  }

  async function handleSelect(): Promise<void> {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${applicationId}/select`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Error al seleccionar contratista');
        return;
      }
      if (data.notified === false) {
        setEmailFailed(true);
        return;
      }
      setIsOpen(false);
      router.refresh();
    } catch {
      setError('Error al seleccionar contratista');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
      >
        Seleccionar
      </button>

      <Modal isOpen={isOpen} onClose={close} title={emailFailed ? 'Contratista seleccionado' : 'Seleccionar contratista'}>
        {emailFailed ? (
          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-xl">
              <p className="text-sm text-yellow-800">
                Seleccionaste a {contractorName} y el proyecto ahora está En ejecución, pero no pudimos enviarle el correo de notificación. Considera contactarle directamente.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              Entendido
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <p className="text-sm text-gray-600">
              ¿Seleccionar a <strong>{contractorName}</strong> para este proyecto? El proyecto pasará a <strong>En ejecución</strong> y le enviaremos un correo para avisarle.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleSelect}
                disabled={isLoading}
                className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Seleccionando...' : 'Confirmar selección'}
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
