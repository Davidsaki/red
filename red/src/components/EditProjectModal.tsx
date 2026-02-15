'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Modal from './Modal';

interface CategoryWithSkills {
  id: number;
  name: string;
  slug: string;
  skills: { id: number; name: string }[];
}

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: number;
    title: string;
    description: string;
    category: string;
    budget: string;
    budget_currency: string;
    skills_required: string[];
  };
}

function formatCOPInput(value: number | string): string {
  const num = typeof value === 'string' ? parseInt(value.replace(/\D/g, ''), 10) : value;
  if (isNaN(num) || num === 0) return '';
  return new Intl.NumberFormat('es-CO').format(num);
}

function parseCOPInput(formatted: string): number {
  const cleaned = formatted.replace(/\D/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}

export default function EditProjectModal({ isOpen, onClose, project }: EditProjectModalProps) {
  const router = useRouter();
  const comboboxRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [category, setCategory] = useState(project.category);
  const [budgetDisplay, setBudgetDisplay] = useState(formatCOPInput(parseFloat(project.budget)));
  const [budgetValue, setBudgetValue] = useState(parseFloat(project.budget));
  const [selectedSkills, setSelectedSkills] = useState<string[]>(project.skills_required || []);
  const [customSkill, setCustomSkill] = useState('');

  const [categories, setCategories] = useState<CategoryWithSkills[]>([]);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset state when modal opens with new project data
  useEffect(() => {
    if (isOpen) {
      setTitle(project.title);
      setDescription(project.description);
      setCategory(project.category);
      setBudgetDisplay(formatCOPInput(parseFloat(project.budget)));
      setBudgetValue(parseFloat(project.budget));
      setSelectedSkills(project.skills_required || []);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, project]);

  // Fetch categories
  useEffect(() => {
    if (isOpen && categories.length === 0) {
      fetch('/api/categories')
        .then((r) => r.json())
        .then((d) => { if (d.success) setCategories(d.categories); })
        .catch(() => {});
    }
  }, [isOpen, categories.length]);

  // Update available skills on category change
  useEffect(() => {
    if (category && categories.length > 0) {
      const cat = categories.find((c) => c.name === category);
      setAvailableSkills(cat ? cat.skills.map((s) => s.name) : []);
    }
  }, [category, categories]);

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

  const filteredCategories = categorySearch.trim()
    ? categories.filter((c) => c.name.toLowerCase().includes(categorySearch.toLowerCase()))
    : categories;

  function selectCategory(name: string): void {
    setCategory(name);
    setCategorySearch('');
    setShowCategoryDropdown(false);
  }

  function handleBudgetChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const numericValue = parseCOPInput(e.target.value);
    setBudgetDisplay(formatCOPInput(numericValue));
    setBudgetValue(numericValue);
  }

  function toggleSkill(skill: string): void {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  function addCustomSkill(): void {
    if (customSkill.trim() && !selectedSkills.includes(customSkill.trim())) {
      setSelectedSkills((prev) => [...prev, customSkill.trim()]);
      setCustomSkill('');
    }
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          budget: budgetValue,
          budget_currency: project.budget_currency || 'COP',
          skills_required: selectedSkills,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Error al actualizar');
      }

      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose(): void {
    setError(null);
    setSuccess(false);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Editar Proyecto">
      {success ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Proyecto Actualizado</h3>
          <p className="text-sm text-gray-500 mb-4">Los cambios se guardaron correctamente.</p>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1.5">
                Título
              </label>
              <input
                id="edit-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Categoría
              </label>
              <div ref={comboboxRef} className="relative">
                <div
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm flex items-center cursor-pointer transition-shadow focus-within:ring-2 focus-within:ring-blue-500"
                  onClick={() => setShowCategoryDropdown(true)}
                >
                  {showCategoryDropdown ? (
                    <input
                      type="text"
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      placeholder="Buscar categoría..."
                      className="w-full outline-none bg-transparent text-sm"
                      autoFocus
                    />
                  ) : (
                    <span className={category ? 'text-gray-900' : 'text-gray-400'}>
                      {category || 'Seleccionar'}
                    </span>
                  )}
                  <svg className="ml-auto w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {showCategoryDropdown && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {filteredCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => selectCategory(cat.name)}
                        className={`w-full text-left px-3.5 py-2 text-sm hover:bg-blue-50 transition-colors first:rounded-t-xl last:rounded-b-xl ${
                          category === cat.name ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Budget */}
            <div>
              <label htmlFor="edit-budget" className="block text-sm font-medium text-gray-700 mb-1.5">
                Presupuesto (COP)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  id="edit-budget"
                  type="text"
                  inputMode="numeric"
                  value={budgetDisplay}
                  onChange={handleBudgetChange}
                  className="w-full pl-8 pr-14 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">COP</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1.5">
                Descripción
              </label>
              <textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-shadow"
              />
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Habilidades
              </label>
              {selectedSkills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedSkills.map((skill) => (
                    <span key={skill} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-blue-50 text-blue-700 font-medium">
                      {skill}
                      <button type="button" onClick={() => toggleSkill(skill)} className="text-blue-400 hover:text-blue-600">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {availableSkills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {availableSkills.filter((s) => !selectedSkills.includes(s)).map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className="px-2.5 py-1 rounded-lg text-xs border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                    >
                      + {skill}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSkill(); } }}
                  placeholder="Agregar habilidad"
                  className="flex-1 px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
                <button
                  type="button"
                  onClick={addCustomSkill}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
}
