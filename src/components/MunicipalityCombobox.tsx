'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  getDepartment,
  getMunicipality,
  listAllMunicipalities,
  formatLocation,
  normalizeText,
  type MunicipalityWithDepartment,
} from '@/lib/colombia';

export interface LocationValue {
  departmentCode: string;
  municipalityCode: string;
}

interface MunicipalityComboboxProps {
  value: LocationValue | null;
  onChange: (value: LocationValue | null) => void;
  /** Restringe las opciones a un departamento (código DANE de 2 dígitos). */
  departmentCode?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
}

const MAX_RESULTS = 50;

interface IndexedOption {
  option: MunicipalityWithDepartment;
  label: string;
  haystack: string;
}

let cachedIndex: IndexedOption[] | null = null;

function getIndex(): IndexedOption[] {
  if (!cachedIndex) {
    cachedIndex = listAllMunicipalities().map((option) => ({
      option,
      label: formatLocation(option.departmentCode, option.code),
      haystack: normalizeText(`${option.name} ${option.departmentName}`),
    }));
  }
  return cachedIndex;
}

export default function MunicipalityCombobox({
  value,
  onChange,
  departmentCode,
  id,
  placeholder = 'Busca un municipio o departamento...',
  disabled = false,
  hasError = false,
}: MunicipalityComboboxProps) {
  const reactId = useId();
  const inputId = id ?? `${reactId}-input`;
  const listboxId = `${reactId}-listbox`;
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedLabel = value ? formatLocation(value.departmentCode, value.municipalityCode) : '';
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo<IndexedOption[]>(() => {
    const q = normalizeText(query);
    const tokens = q.split(/\s+/).filter(Boolean);
    const pool = departmentCode
      ? getIndex().filter((i) => i.option.departmentCode === departmentCode)
      : getIndex();
    const filtered = tokens.length === 0 ? pool : pool.filter((i) => tokens.every((t) => i.haystack.includes(t)));
    return filtered.slice(0, MAX_RESULTS);
  }, [query, departmentCode]);

  // Cierra al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mantiene visible la opción activa
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, open]);

  function select(item: IndexedOption): void {
    onChange({ departmentCode: item.option.departmentCode, municipalityCode: item.option.code });
    setQuery('');
    setOpen(false);
  }

  function clear(): void {
    onChange(null);
    setQuery('');
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && results[activeIndex]) {
        e.preventDefault();
        select(results[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        setOpen(false);
        setQuery('');
      }
    }
  }

  // Si hay selección y el usuario no está escribiendo, se muestra la etiqueta seleccionada
  const inputValue = open || query ? query : selectedLabel;
  const activeOptionId = open && results[activeIndex] ? `${listboxId}-${results[activeIndex].option.code}` : undefined;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          aria-invalid={hasError || undefined}
          autoComplete="off"
          disabled={disabled}
          value={inputValue}
          placeholder={selectedLabel && !open ? selectedLabel : placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className={`w-full px-3 py-2 pr-9 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:text-gray-400 ${
            hasError ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {(value || query) && !disabled && (
          <button
            type="button"
            onClick={clear}
            aria-label="Borrar ubicación"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-64 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg py-1 text-sm"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-gray-500" role="presentation">
              No se encontraron municipios
            </li>
          ) : (
            results.map((item, index) => (
              <li
                key={item.option.code}
                id={`${listboxId}-${item.option.code}`}
                role="option"
                aria-selected={value?.municipalityCode === item.option.code}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(item)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`px-3 py-2 cursor-pointer ${
                  index === activeIndex ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                } ${value?.municipalityCode === item.option.code ? 'font-medium' : ''}`}
              >
                {item.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

/** Construye un LocationValue desde códigos (o null si no son válidos). */
export function toLocationValue(
  departmentCode: string | null | undefined,
  municipalityCode: string | null | undefined
): LocationValue | null {
  const mpio = getMunicipality(municipalityCode);
  if (!mpio) return null;
  const dept = getDepartment(departmentCode ?? mpio.departmentCode);
  return { departmentCode: dept?.code ?? mpio.departmentCode, municipalityCode: mpio.code };
}
