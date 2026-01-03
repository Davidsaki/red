// src/lib/validations.ts
import { z } from 'zod';

// Project creation schema
export const projectSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(255, 'Title is too long'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  category: z.string().min(1, 'Category is required'),
  budget: z.number().positive('Budget must be a positive number').max(1000000, 'Budget is too high'),
  skills_required: z.array(z.string()).min(1, 'At least one skill is required').max(10, 'Maximum 10 skills allowed'),
});

export type ProjectFormData = z.infer<typeof projectSchema>;

// Application creation schema
export const applicationSchema = z.object({
  project_id: z.number().positive(),
  proposal: z.string().min(50, 'Proposal must be at least 50 characters'),
  bid: z.number().positive('Bid must be a positive number'),
});

export type ApplicationFormData = z.infer<typeof applicationSchema>;

// Project categories
export const PROJECT_CATEGORIES = [
  'Web Development',
  'Mobile Development',
  'Design',
  'Writing',
  'Marketing',
  'Data Science',
  'DevOps',
  'Other',
] as const;

// Common skills
export const COMMON_SKILLS = [
  'JavaScript',
  'TypeScript',
  'React',
  'Next.js',
  'Node.js',
  'Python',
  'Django',
  'FastAPI',
  'SQL',
  'PostgreSQL',
  'MongoDB',
  'AWS',
  'Docker',
  'Kubernetes',
  'Figma',
  'Photoshop',
  'UI/UX Design',
  'Content Writing',
  'SEO',
  'Marketing',
  'Data Analysis',
] as const;
