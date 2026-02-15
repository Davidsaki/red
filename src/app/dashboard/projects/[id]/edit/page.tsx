'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { projectSchema, ProjectFormData } from '@/lib/validations';
import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';

interface CategoryWithSkills {
  id: number;
  name: string;
  slug: string;
  skills: { id: number; name: string }[];
}

// Format number with thousand separators (COP style: 1.000.000)
function formatCOPInput(value: number | string): string {
  const num = typeof value === 'string' ? parseInt(value.replace(/\D/g, ''), 10) : value;
  if (isNaN(num) || num === 0) return '';
  return new Intl.NumberFormat('es-CO').format(num);
}

// Parse formatted string back to number
function parseCOPInput(formatted: string): number {
  const cleaned = formatted.replace(/\D/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const projectId = parseInt(id, 10);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [categories, setCategories] = useState<CategoryWithSkills[]>([]);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [budgetDisplay, setBudgetDisplay] = useState('');

  // Category combobox state
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const comboboxRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      skills_required: [],
      budget_currency: 'COP',
    },
  });

  const selectedCategory = watch('category');

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setShowCategoryDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch categories and project data on mount
  useEffect(() => {
    async function loadData(): Promise<void> {
      try {
        const [catRes, projRes] = await Promise.all([
          fetch('/api/categories'),
          fetch(`/api/projects/${projectId}`),
        ]);
        const catData = await catRes.json();
        const projData = await projRes.json();

        if (!projData.success) {
          setError('Proyecto no encontrado');
          setIsLoading(false);
          return;
        }

        if (catData.success) {
          setCategories(catData.categories);
        }

        const p = projData.project;
        reset({
          title: p.title,
          description: p.description,
          category: p.category,
          budget: parseFloat(p.budget),
          budget_currency: p.budget_currency || 'COP',
          skills_required: p.skills_required || [],
        });
        setSelectedCategoryName(p.category);
        setSelectedSkills(p.skills_required || []);
        setBudgetDisplay(formatCOPInput(parseFloat(p.budget)));
        setIsLoading(false);
      } catch {
        setError('Error al cargar los datos del proyecto');
        setIsLoading(false);
      }
    }
    loadData();
  }, [projectId, reset]);

  // Update available skills when category changes
  useEffect(() => {
    if (selectedCategory && categories.length > 0) {
      const cat = categories.find((c) => c.name === selectedCategory);
      if (cat) {
        setAvailableSkills(cat.skills.map((s) => s.name));
      } else {
        setAvailableSkills([]);
      }
    }
  }, [selectedCategory, categories]);

  // Filtered categories for combobox
  const filteredCategories = categorySearch.trim()
    ? categories.filter((c) =>
        c.name.toLowerCase().includes(categorySearch.toLowerCase())
      )
    : categories;

  function selectCategory(name: string): void {
    setSelectedCategoryName(name);
    setCategorySearch('');
    setShowCategoryDropdown(false);
    setValue('category', name);
  }

  const toggleSkill = (skill: string) => {
    const newSkills = selectedSkills.includes(skill)
      ? selectedSkills.filter((s) => s !== skill)
      : [...selectedSkills, skill];
    setSelectedSkills(newSkills);
    setValue('skills_required', newSkills);
  };

  const addCustomSkill = () => {
    if (customSkill.trim() && !selectedSkills.includes(customSkill.trim())) {
      const newSkills = [...selectedSkills, customSkill.trim()];
      setSelectedSkills(newSkills);
      setValue('skills_required', newSkills);
      setCustomSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    const newSkills = selectedSkills.filter((s) => s !== skill);
    setSelectedSkills(newSkills);
    setValue('skills_required', newSkills);
  };

  function handleBudgetChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const raw = e.target.value;
    const numericValue = parseCOPInput(raw);
    setBudgetDisplay(formatCOPInput(numericValue));
    setValue('budget', numericValue);
  }

  const onSubmit = async (data: ProjectFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar proyecto');
      }

      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Cargando proyecto...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Editar Proyecto</h1>
            <p className="text-gray-600 mt-2">
              Modifica los detalles de tu proyecto
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Título del Proyecto *
              </label>
              <input
                {...register('title')}
                type="text"
                id="title"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            {/* Category - Searchable Combobox */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría *
              </label>
              <input type="hidden" {...register('category')} />

              <div ref={comboboxRef} className="relative">
                <div
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent flex items-center cursor-pointer"
                  onClick={() => setShowCategoryDropdown(true)}
                >
                  {showCategoryDropdown ? (
                    <input
                      type="text"
                      value={categorySearch}
                      onChange={(e) => {
                        setCategorySearch(e.target.value);
                        setShowCategoryDropdown(true);
                      }}
                      placeholder="Escribe para buscar categoría..."
                      className="w-full outline-none bg-transparent"
                      autoFocus
                    />
                  ) : (
                    <span className={selectedCategoryName ? 'text-gray-900' : 'text-gray-400'}>
                      {selectedCategoryName || 'Selecciona una categoría'}
                    </span>
                  )}
                  <svg
                    className="ml-auto w-4 h-4 text-gray-400 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {showCategoryDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredCategories.length === 0 && categorySearch.trim() && (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        No se encontraron categorías para &quot;{categorySearch}&quot;
                      </div>
                    )}
                    {filteredCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => selectCategory(cat.name)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors ${
                          selectedCategoryName === cat.name
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-700'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {errors.category && (
                <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
              )}
            </div>

            {/* Budget with formatting */}
            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">
                Presupuesto (COP) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  id="budget"
                  value={budgetDisplay}
                  onChange={handleBudgetChange}
                  placeholder="500.000"
                  className="w-full pl-8 pr-16 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">COP</span>
              </div>
              <input type="hidden" {...register('budget_currency')} value="COP" />
              {errors.budget && (
                <p className="mt-1 text-sm text-red-600">{errors.budget.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Descripción del Proyecto *
              </label>
              <textarea
                {...register('description')}
                id="description"
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Habilidades Requeridas *
              </label>

              {selectedSkills.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {availableSkills.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-2">Habilidades de la categoría:</p>
                  <div className="flex flex-wrap gap-2">
                    {availableSkills.map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`px-3 py-1 rounded-full text-sm border transition-colors ${
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

              {selectedCategory && availableSkills.length === 0 && (
                <p className="text-sm text-gray-500 mb-3">
                  Esta categoría no tiene habilidades predefinidas. Agrega habilidades personalizadas.
                </p>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomSkill();
                    }
                  }}
                  placeholder="Agregar habilidad personalizada"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={addCustomSkill}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Agregar
                </button>
              </div>

              {errors.skills_required && (
                <p className="mt-1 text-sm text-red-600">{errors.skills_required.message}</p>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed font-medium"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
