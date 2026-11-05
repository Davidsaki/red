import { describe, it, expect } from 'vitest';
import {
  listDepartments,
  getDepartment,
  getMunicipality,
  isMunicipalityInDepartment,
  normalizeText,
  formatLocation,
  listAllMunicipalities,
} from '@/lib/colombia';
import { titleCase } from '../../../scripts/build-colombia-data.mjs';

describe('colombia data', () => {
  it('has 33 departments and every code has the right length', () => {
    const depts = listDepartments();
    expect(depts).toHaveLength(33);
    for (const d of depts) {
      expect(d.code).toHaveLength(2);
      for (const m of d.municipalities) {
        expect(m.code).toHaveLength(5);
        expect(m.code.startsWith(d.code)).toBe(true);
      }
    }
    expect(listAllMunicipalities().length).toBeGreaterThan(1100);
  });

  it('sorts departments alphabetically', () => {
    const names = listDepartments().map((d) => d.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'es')));
  });
});

describe('lookups', () => {
  it('gets department and municipality by code', () => {
    expect(getDepartment('05')?.name).toBe('Antioquia');
    expect(getMunicipality('05001')?.name).toBe('Medellín');
    expect(getMunicipality('05001')?.departmentCode).toBe('05');
  });

  it('returns undefined for unknown/empty codes', () => {
    expect(getDepartment('99999')).toBeUndefined();
    expect(getMunicipality('00000')).toBeUndefined();
    expect(getMunicipality(null)).toBeUndefined();
    expect(getDepartment(undefined)).toBeUndefined();
  });

  it('isMunicipalityInDepartment checks membership', () => {
    expect(isMunicipalityInDepartment('05', '05001')).toBe(true);
    expect(isMunicipalityInDepartment('11', '05001')).toBe(false);
    expect(isMunicipalityInDepartment('05', 'nope')).toBe(false);
  });
});

describe('normalizeText', () => {
  it('lowercases and strips diacritics', () => {
    expect(normalizeText('Bogotá')).toBe('bogota');
    expect(normalizeText('  Chocó ')).toBe('choco');
    expect(normalizeText('NARIÑO')).toBe('narino');
  });
});

describe('formatLocation', () => {
  it('formats "Municipio, Departamento"', () => {
    expect(formatLocation('05', '05001')).toBe('Medellín, Antioquia');
    expect(formatLocation(null, '05001')).toBe('Medellín, Antioquia');
  });

  it('does not repeat Bogotá, D.C.', () => {
    expect(formatLocation('11', '11001')).toBe('Bogotá, D.C.');
  });

  it('returns empty string for invalid or mismatched input', () => {
    expect(formatLocation('05', null)).toBe('');
    expect(formatLocation('11', '05001')).toBe('');
    expect(formatLocation('05', '00000')).toBe('');
  });
});

describe('titleCase (data build script)', () => {
  it.each([
    ['MEDELLÍN', 'Medellín'],
    ['BOGOTÁ, D.C.', 'Bogotá, D.C.'],
    ['ARCHIPIÉLAGO DE SAN ANDRÉS, PROVIDENCIA Y SANTA CATALINA', 'Archipiélago de San Andrés, Providencia y Santa Catalina'],
    ['SAN PEDRO DE LOS MILAGROS', 'San Pedro de los Milagros'],
    ['EL CARMEN DE VIBORAL', 'El Carmen de Viboral'],
    ['LA GUAJIRA', 'La Guajira'],
    ['NARIÑO', 'Nariño'],
  ])('%s -> %s', (input, expected) => {
    expect(titleCase(input)).toBe(expected);
  });
});
