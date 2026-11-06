interface StarsDisplayProps {
  rating: number;
}

export default function StarsDisplay({ rating }: StarsDisplayProps) {
  return (
    <span className="inline-flex" role="img" aria-label={`${rating} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} aria-hidden="true" className={star <= rating ? 'text-yellow-400' : 'text-gray-200'}>
          ★
        </span>
      ))}
    </span>
  );
}
