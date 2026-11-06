'use client';

import { useState } from 'react';
import ReviewModal from './ReviewModal';

interface FinishedEngagementReviewProps {
  applicationId: number;
  contractorName: string | null;
  rating?: number | null;
  comment?: string | null;
}

export default function FinishedEngagementReview({
  applicationId,
  contractorName,
  rating,
  comment,
}: FinishedEngagementReviewProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
      >
        {rating ? 'Editar' : 'Calificar'}
      </button>
      {open && (
        <ReviewModal
          isOpen
          onClose={() => setOpen(false)}
          applicationId={applicationId}
          contractorName={contractorName}
          initialRating={rating ?? undefined}
          initialComment={comment}
        />
      )}
    </>
  );
}
