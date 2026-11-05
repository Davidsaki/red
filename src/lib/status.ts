export interface StatusStyle {
  label: string;
  badge: string;
  dot: string;
}

export const PROJECT_STATUS: Record<string, StatusStyle> = {
  open: { label: 'Abierto', badge: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  in_progress: { label: 'En ejecución', badge: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
  completed: { label: 'Completado', badge: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  closed: { label: 'Cerrado', badge: 'bg-yellow-50 text-yellow-700', dot: 'bg-yellow-500' },
  cancelled: { label: 'Cancelado', badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
};

export const APPLICATION_STATUS: Record<string, StatusStyle> = {
  pending: { label: 'Pendiente', badge: 'bg-yellow-50 text-yellow-700', dot: 'bg-yellow-500' },
  accepted: { label: 'Seleccionado', badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  finished: { label: 'Trabajo finalizado', badge: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  rejected: { label: 'Rechazada', badge: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
};

const FALLBACK: StatusStyle = { label: '', badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };

export function projectStatusStyle(status: string): StatusStyle {
  return PROJECT_STATUS[status] ?? { ...FALLBACK, label: status };
}

export function applicationStatusStyle(status: string): StatusStyle {
  return APPLICATION_STATUS[status] ?? { ...FALLBACK, label: status };
}
