'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Category {
  id: number;
  name: string;
  slug: string;
  skills: { id: number; name: string }[];
}

function formatCOPInput(value: number | string): string {
  const num = typeof value === 'string' ? parseInt(value.replace(/\D/g, ''), 10) : value;
  if (isNaN(num) || num === 0) return '';
  return new Intl.NumberFormat('es-CO').format(num);
}

function parseCOPInput(formatted: string): string {
  return formatted.replace(/\D/g, '');
}

export default function ProjectFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [budgetMin, setBudgetMin] = useState(searchParams.get('budgetMin') || '');
  const [budgetMax, setBudgetMax] = useState(searchParams.get('budgetMax') || '');
  const [budgetMinDisplay, setBudgetMinDisplay] = useState(
    searchParams.get('budgetMin') ? formatCOPInput(searchParams.get('budgetMin')!) : ''
  );
  const [budgetMaxDisplay, setBudgetMaxDisplay] = useState(
    searchParams.get('budgetMax') ? formatCOPInput(searchParams.get('budgetMax')!) : ''
  );
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    searchParams.get('skills')?.split(',').filter(Boolean) || []
  );

  const availableSkills = category
    ? categories.find((c) => c.name === category)?.skills.map((s) => s.name) || []
    : [];

  const updateURL = useCallback(
    (overrides?: Record<string, string>) => {
      const params = new URLSearchParams();

      const finalSearch = overrides?.search ?? search;
      const finalCategory = overrides?.category ?? category;
      const finalBudgetMin = overrides?.budgetMin ?? budgetMin;
      const finalBudgetMax = overrides?.budgetMax ?? budgetMax;
      const finalSkills = overrides?.skills ?? selectedSkills.join(',');

      if (finalSearch) params.set('search', finalSearch);
      if (finalCategory) params.set('category', finalCategory);
      if (finalBudgetMin) params.set('budgetMin', finalBudgetMin);
      if (finalBudgetMax) params.set('budgetMax', finalBudgetMax);
      if (finalSkills) params.set('skills', finalSkills);
      params.set('page', '1');

      router.push(`/projects?${params.toString()}`);
    },
    [search, category, budgetMin, budgetMax, selectedSkills, router]
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentSearch = searchParams.get('search') || '';
      if (search !== currentSearch) {
        updateURL({ search });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search, searchParams, updateURL]);

  function handleCategoryChange(newCategory: string): void {
    setCategory(newCategory);
    setSelectedSkills([]);
    updateURL({ category: newCategory, skills: '' });
  }

  function toggleSkill(skill: string): void {
    const newSkills = selectedSkills.includes(skill)
      ? selectedSkills.filter((s) => s !== skill)
      : [...selectedSkills, skill];
    setSelectedSkills(newSkills);
    updateURL({ skills: newSkills.join(',') });
  }

  function handleBudgetMinChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const raw = parseCOPInput(e.target.value);
    setBudgetMin(raw);
    setBudgetMinDisplay(raw ? formatCOPInput(raw) : '');
  }

  function handleBudgetMaxChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const raw = parseCOPInput(e.target.value);
    setBudgetMax(raw);
    setBudgetMaxDisplay(raw ? formatCOPInput(raw) : '');
  }

  function handleBudgetApply(): void {
    updateURL();
  }

  function clearFilters(): void {
    setSearch('');
    setCategory('');
    setBudgetMin('');
    setBudgetMax('');
    setBudgetMinDisplay('');
    setBudgetMaxDisplay('');
    setSelectedSkills([]);
    router.push('/projects');
  }

  const hasFilters = search || category || budgetMin || budgetMax || selectedSkills.length > 0;

  return (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar proyectos..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
        <select
          value={category}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        >
          <option value="">Todas las categorías</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Skills (based on category) */}
      {availableSkills.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Habilidades</label>
          <div className="flex flex-wrap gap-1.5">
            {availableSkills.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                  selectedSkills.includes(skill)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Budget Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Presupuesto (COP)</label>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={budgetMinDisplay}
            onChange={handleBudgetMinChange}
            placeholder="$ Mín"
            className="w-1/2 px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <input
            type="text"
            inputMode="numeric"
            value={budgetMaxDisplay}
            onChange={handleBudgetMaxChange}
            placeholder="$ Máx"
            className="w-1/2 px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <button
          type="button"
          onClick={handleBudgetApply}
          className="mt-2 w-full px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200"
        >
          Aplicar rango
        </button>
      </div>

      {/* Clear Filters */}
      {hasFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="w-full px-3 py-2 bg-red-50 text-red-600 text-sm rounded-md hover:bg-red-100 border border-red-200"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
