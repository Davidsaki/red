interface RatingSummaryProps {
  average?: number | null;
  count?: number | null;
}

const averageFormat = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default function RatingSummary({ average, count }: RatingSummaryProps) {
  if (!count || average == null) {
    return <span className="text-xs text-gray-400">Sin calificaciones</span>;
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium text-gray-600"
      title={`${averageFormat.format(average)} de 5 en ${count} calificación${count !== 1 ? 'es' : ''}`}
    >
      <span className="text-yellow-400" aria-hidden="true">★</span>
      {averageFormat.format(average)} ({count})
    </span>
  );
}
