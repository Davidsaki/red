// src/lib/validations.ts
import { z } from 'zod';

// Project creation schema
export const projectSchema = z.object({
  title: z.string().min(5, 'El título debe tener al menos 5 caracteres').max(255, 'El título es demasiado largo'),
  description: z.string().min(20, 'La descripción debe tener al menos 20 caracteres'),
  category: z.string().min(1, 'La categoría es requerida'),
  budget: z.number().positive('El presupuesto debe ser un número positivo').max(50000000000, 'El presupuesto es demasiado alto'),
  budget_currency: z.enum(['COP', 'USD']).optional(),
  skills_required: z.array(z.string()).min(1, 'Se requiere al menos una habilidad').max(10, 'Máximo 10 habilidades permitidas'),
});

export type ProjectFormData = z.infer<typeof projectSchema>;

// Application creation schema
export const applicationSchema = z.object({
  project_id: z.number().positive(),
  proposal: z.string().min(50, 'La propuesta debe tener al menos 50 caracteres'),
  bid: z.number().positive('La oferta debe ser un número positivo').optional(),
});

export type ApplicationFormData = z.infer<typeof applicationSchema>;

// Category suggestion schema
export const categorySuggestionSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(255, 'El nombre es demasiado largo'),
});

export type CategorySuggestionData = z.infer<typeof categorySuggestionSchema>;
