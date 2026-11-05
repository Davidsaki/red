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
    work_mode: 'remote',
  };

  it('accepts valid data', () => {
    const result = projectSchema.safeParse(validProject);
    expect(result.success).toBe(true);
  });

  it('accepts valid data with optional budget_currency', () => {
    const result = projectSchema.safeParse({ ...validProject, budget_currency: 'USD' });
    expect(result.success).toBe(true);
  });

  describe('work mode and location', () => {
    it('accepts remote without location', () => {
      expect(projectSchema.safeParse(validProject).success).toBe(true);
    });

    it('accepts remote with an optional location', () => {
      const result = projectSchema.safeParse({ ...validProject, department_code: '05', municipality_code: '05001' });
      expect(result.success).toBe(true);
    });

    it('rejects missing work_mode', () => {
      const { work_mode: omitted, ...rest } = validProject;
      void omitted;
      expect(projectSchema.safeParse(rest).success).toBe(false);
    });

    it('rejects unknown work_mode', () => {
      expect(projectSchema.safeParse({ ...validProject, work_mode: 'moon' }).success).toBe(false);
    });

    it.each(['hybrid', 'onsite'])('rejects %s without municipality, error on municipality field', (mode) => {
      const result = projectSchema.safeParse({ ...validProject, work_mode: mode });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path[0] === 'municipality_code');
        expect(issue?.message).toMatch(/municipio/i);
      }
    });

    it('accepts onsite with a valid department/municipality pair', () => {
      const result = projectSchema.safeParse({
        ...validProject,
        work_mode: 'onsite',
        department_code: '05',
        municipality_code: '05001',
      });
      expect(result.success).toBe(true);
    });

    it('rejects unknown municipality code', () => {
      const result = projectSchema.safeParse({ ...validProject, department_code: '05', municipality_code: '99999' });
      expect(result.success).toBe(false);
    });

    it('rejects municipality that does not belong to the department', () => {
      const result = projectSchema.safeParse({
        ...validProject,
        work_mode: 'hybrid',
        department_code: '11',
        municipality_code: '05001',
      });
      expect(result.success).toBe(false);
    });

    it('rejects municipality without department', () => {
      const result = projectSchema.safeParse({ ...validProject, municipality_code: '05001' });
      expect(result.success).toBe(false);
    });

    it('treats empty strings as no location for remote', () => {
      const result = projectSchema.safeParse({ ...validProject, department_code: '', municipality_code: '' });
      expect(result.success).toBe(true);
    });
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

  it('accepts data without bid (optional)', () => {
    const { bid, ...noBid } = validApplication;
    const result = applicationSchema.safeParse(noBid);
    expect(result.success).toBe(true);
  });

  it('accepts data with undefined bid', () => {
    const result = applicationSchema.safeParse({ ...validApplication, bid: undefined });
    expect(result.success).toBe(true);
  });

  it('rejects proposal shorter than 20 characters', () => {
    const result = applicationSchema.safeParse({ ...validApplication, proposal: 'Corta' });
    expect(result.success).toBe(false);
  });

  it('enforces the 20 character proposal minimum at the boundary', () => {
    expect(applicationSchema.safeParse({ ...validApplication, proposal: 'a'.repeat(19) }).success).toBe(false);
    expect(applicationSchema.safeParse({ ...validApplication, proposal: 'a'.repeat(20) }).success).toBe(true);
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
