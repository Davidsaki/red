// src/lib/colombia.ts
// Helpers tipados sobre los datos DIVIPOLA (DANE) generados en src/data/colombia.json
import data from '@/data/colombia.json';

export interface Municipality {
  code: string;
  name: string;
}

export interface Department {
  code: string;
  name: string;
  municipalities: Municipality[];
}

export interface MunicipalityWithDepartment extends Municipality {
  departmentCode: string;
  departmentName: string;
}

const DEPARTMENTS: Department[] = (data as { departments: Department[] }).departments;

const DEPARTMENT_BY_CODE = new Map<string, Department>();
const MUNICIPALITY_BY_CODE = new Map<string, MunicipalityWithDepartment>();

for (const dept of DEPARTMENTS) {
  DEPARTMENT_BY_CODE.set(dept.code, dept);
  for (const mpio of dept.municipalities) {
    MUNICIPALITY_BY_CODE.set(mpio.code, {
      ...mpio,
      departmentCode: dept.code,
      departmentName: dept.name,
    });
  }
}

const ALL_MUNICIPALITIES: MunicipalityWithDepartment[] = [...MUNICIPALITY_BY_CODE.values()];

export function listDepartments(): Department[] {
  return DEPARTMENTS;
}

export function getDepartment(code: string | null | undefined): Department | undefined {
  return code ? DEPARTMENT_BY_CODE.get(code) : undefined;
}

export function getMunicipality(code: string | null | undefined): MunicipalityWithDepartment | undefined {
  return code ? MUNICIPALITY_BY_CODE.get(code) : undefined;
}

export function listAllMunicipalities(): MunicipalityWithDepartment[] {
  return ALL_MUNICIPALITIES;
}

export function isMunicipalityInDepartment(deptCode: string, mpioCode: string): boolean {
  const mpio = MUNICIPALITY_BY_CODE.get(mpioCode);
  return !!mpio && mpio.departmentCode === deptCode;
}

/** Minúsculas y sin diacríticos: "Bogotá" -> "bogota". */
export function normalizeText(text: string): string {
  return Array.from(text.normalize('NFD'))
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code < 0x0300 || code > 0x036f;
    })
    .join('')
    .toLowerCase()
    .trim();
}

/** "Medellín, Antioquia". Devuelve '' si no hay municipio válido. */
export function formatLocation(
  deptCode: string | null | undefined,
  mpioCode: string | null | undefined
): string {
  const mpio = getMunicipality(mpioCode);
  if (!mpio) return '';
  if (deptCode && deptCode !== mpio.departmentCode) return '';
  // Bogotá, D.C. es a la vez departamento y municipio: no repetir.
  if (normalizeText(mpio.name) === normalizeText(mpio.departmentName)) return mpio.name;
  return `${mpio.name}, ${mpio.departmentName}`;
}
