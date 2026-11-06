'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from './Modal';
import StarRatingInput from './StarRatingInput';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: number;
  contractorName: string | null;
  initialRating?: number;
  initialComment?: string | null;
}

const COMMENT_MAX = 1000;

export default function ReviewModal({
  isOpen,
  onClose,
  applicationId,
  contractorName,
  initialRating,
  initialComment,
}: ReviewModalProps) {
  const router = useRouter();
  const [rating, setRating] = useState(initialRating ?? 0);
  const [comment, setComment] = useState(initialComment ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose(): void {
    setError(null);
    onClose();
    router.refresh();
  }

  async function handleSave(): Promise<void> {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${applicationId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Error al guardar la calificación');
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError('Error al guardar la calificación');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Calificar contratista">
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        <p className="text-sm text-gray-600">
          ¿Cómo fue el trabajo de <span className="font-medium text-gray-900">{contractorName ?? 'este contratista'}</span>?
          Tu calificación ayuda a otros empleadores.
        </p>
        <StarRatingInput value={rating} onChange={setRating} />
        <div>
          <label htmlFor="reviewComment" className="block text-sm font-medium text-gray-700 mb-1.5">
            Comentario (opcional)
          </label>
          <textarea
            id="reviewComment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={COMMENT_MAX}
            rows={4}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-shadow"
          />
          <p className="mt-1 text-xs text-gray-400 text-right">
            {comment.length}/{COMMENT_MAX}
          </p>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading || rating < 1}
            className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Guardando...' : 'Guardar calificación'}
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Calificar después
          </button>
        </div>
      </div>
    </Modal>
  );
}
