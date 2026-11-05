// src/lib/validations.ts
import { z } from 'zod';
import { getMunicipality, isMunicipalityInDepartment } from '@/lib/colombia';

export const WORK_MODES = ['remote', 'hybrid', 'onsite'] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  remote: 'Remoto',
  hybrid: 'Híbrido',
  onsite: 'Presencial',
};

// Project creation schema
export const projectSchema = z.object({
  title: z.string().min(5, 'El título debe tener al menos 5 caracteres').max(255, 'El título es demasiado largo'),
  description: z.string().min(20, 'La descripción debe tener al menos 20 caracteres').max(5000, 'La descripción es demasiado larga'),
  category: z.string().min(1, 'La categoría es requerida'),
  budget: z.number().positive('El presupuesto debe ser un número positivo').max(50000000000, 'El presupuesto es demasiado alto'),
  budget_currency: z.enum(['COP', 'USD']).optional(),
  skills_required: z.array(z.string()).min(1, 'Se requiere al menos una habilidad').max(10, 'Máximo 10 habilidades permitidas'),
  work_mode: z.enum(WORK_MODES, { error: 'Selecciona la modalidad de trabajo' }),
  department_code: z.string().max(2).optional(),
  municipality_code: z.string().max(5).optional(),
}).superRefine((data, ctx) => {
  const dept = data.department_code || undefined;
  const mpio = data.municipality_code || undefined;

  if (!mpio) {
    if (data.work_mode !== 'remote') {
      ctx.addIssue({
        code: 'custom',
        path: ['municipality_code'],
        message: 'Selecciona el municipio para proyectos híbridos o presenciales',
      });
    } else if (dept) {
      ctx.addIssue({
        code: 'custom',
        path: ['municipality_code'],
        message: 'Selecciona un municipio',
      });
    }
    return;
  }

  if (!getMunicipality(mpio)) {
    ctx.addIssue({ code: 'custom', path: ['municipality_code'], message: 'Municipio inválido' });
    return;
  }
  if (!dept || !isMunicipalityInDepartment(dept, mpio)) {
    ctx.addIssue({
      code: 'custom',
      path: ['municipality_code'],
      message: 'El municipio no pertenece al departamento seleccionado',
    });
  }
});

/** Normaliza ubicación vacía a null para persistir. */
export function normalizeLocation(data: {
  department_code?: string;
  municipality_code?: string;
}): { department_code: string | null; municipality_code: string | null } {
  const mpio = data.municipality_code || null;
  return {
    department_code: mpio ? data.department_code || null : null,
    municipality_code: mpio,
  };
}

export type ProjectFormData = z.infer<typeof projectSchema>;

// Application creation schema
export const applicationSchema = z.object({
  project_id: z.number().positive(),
  proposal: z.string().min(20, 'La propuesta debe tener al menos 20 caracteres').max(5000, 'La propuesta es demasiado larga'),
  bid: z.number().positive('La oferta debe ser un número positivo').optional(),
});

export type ApplicationFormData = z.infer<typeof applicationSchema>;

// Category suggestion schema
export const categorySuggestionSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(255, 'El nombre es demasiado largo'),
});

export type CategorySuggestionData = z.infer<typeof categorySuggestionSchema>;
