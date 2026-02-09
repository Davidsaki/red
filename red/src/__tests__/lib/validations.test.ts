import { describe, it, expect } from 'vitest';
import {
  projectSchema,
  applicationSchema,
  categorySuggestionSchema,
} from '@/lib/validations';

describe('projectSchema', () => {
  const validProject = {
    title: 'Proyecto de ejemplo',
    description: 'Esta es una descripción suficientemente larga para pasar la validación del esquema',
    category: 'Desarrollo Web',
    budget: 500000,
    skills_required: ['JavaScript', 'React'],
  };

  it('accepts valid data', () => {
    const result = projectSchema.safeParse(validProject);
    expect(result.success).toBe(true);
  });

  it('accepts valid data with optional budget_currency', () => {
    const result = projectSchema.safeParse({ ...validProject, budget_currency: 'USD' });
    expect(result.success).toBe(true);
  });

  it('rejects title shorter than 5 characters', () => {
    const result = projectSchema.safeParse({ ...validProject, title: 'Abc' });
    expect(result.success).toBe(false);
  });

  it('rejects description shorter than 20 characters', () => {
    const result = projectSchema.safeParse({ ...validProject, description: 'Corta' });
    expect(result.success).toBe(false);
  });

  it('rejects negative budget', () => {
    const result = projectSchema.safeParse({ ...validProject, budget: -100 });
    expect(result.success).toBe(false);
  });

  it('rejects zero budget', () => {
    const result = projectSchema.safeParse({ ...validProject, budget: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects empty skills array', () => {
    const result = projectSchema.safeParse({ ...validProject, skills_required: [] });
    expect(result.success).toBe(false);
  });

  it('rejects more than 10 skills', () => {
    const skills = Array.from({ length: 11 }, (_, i) => `Skill ${i + 1}`);
    const result = projectSchema.safeParse({ ...validProject, skills_required: skills });
    expect(result.success).toBe(false);
  });

  it('rejects empty category', () => {
    const result = projectSchema.safeParse({ ...validProject, category: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid budget_currency', () => {
    const result = projectSchema.safeParse({ ...validProject, budget_currency: 'EUR' });
    expect(result.success).toBe(false);
  });
});

describe('applicationSchema', () => {
  const validApplication = {
    project_id: 1,
    proposal: 'Esta es una propuesta de trabajo lo suficientemente larga como para pasar la validación mínima de caracteres',
    bid: 250000,
  };

  it('accepts valid data', () => {
    const result = applicationSchema.safeParse(validApplication);
    expect(result.success).toBe(true);
  });

  it('rejects proposal shorter than 50 characters', () => {
    const result = applicationSchema.safeParse({ ...validApplication, proposal: 'Corta' });
    expect(result.success).toBe(false);
  });

  it('rejects negative bid', () => {
    const result = applicationSchema.safeParse({ ...validApplication, bid: -50 });
    expect(result.success).toBe(false);
  });

  it('rejects zero bid', () => {
    const result = applicationSchema.safeParse({ ...validApplication, bid: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects non-positive project_id', () => {
    const result = applicationSchema.safeParse({ ...validApplication, project_id: 0 });
    expect(result.success).toBe(false);
  });
});

describe('categorySuggestionSchema', () => {
  it('accepts valid name', () => {
    const result = categorySuggestionSchema.safeParse({ name: 'Nueva Categoría' });
    expect(result.success).toBe(true);
  });

  it('rejects name shorter than 2 characters', () => {
    const result = categorySuggestionSchema.safeParse({ name: 'A' });
    expect(result.success).toBe(false);
  });

  it('rejects name longer than 255 characters', () => {
    const result = categorySuggestionSchema.safeParse({ name: 'A'.repeat(256) });
    expect(result.success).toBe(false);
  });

  it('accepts name with exactly 2 characters', () => {
    const result = categorySuggestionSchema.safeParse({ name: 'AB' });
    expect(result.success).toBe(true);
  });

  it('accepts name with exactly 255 characters', () => {
    const result = categorySuggestionSchema.safeParse({ name: 'A'.repeat(255) });
    expect(result.success).toBe(true);
  });
});
