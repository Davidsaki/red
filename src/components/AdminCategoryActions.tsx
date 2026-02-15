'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface RelatedProject {
  id: number;
  title: string;
  description: string;
  category: string;
  budget: string;
  budget_currency: string;
  skills_required: string[];
  status: string;
  created_at: string;
  employer_name: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  status: string;
  suggested_by_name: string | null;
  suggested_by_email: string | null;
  created_at: string;
  related_project_id: number | null;
  related_project: RelatedProject | null;
  skills: { id: number; name: string }[];
  suggested_skills: string[] | null;
}

interface ApprovedCategory {
  id: number;
  name: string;
}

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function AdminCategoryActions({
  categories,
  approvedCategories,
}: {
  categories: Category[];
  approvedCategories: ApprovedCategory[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [reassignCatId, setReassignCatId] = useState<Record<number, number | null>>({});
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [editedNames, setEditedNames] = useState<Record<number, string>>({});
  const [selectedSkills, setSelectedSkills] = useState<Record<number, string[]>>({});
  const [editedSkills, setEditedSkills] = useState<Record<string, string>>({});
  const [editingSkillKey, setEditingSkillKey] = useState<string | null>(null);

  const pendingCategories = categories.filter((c) => c.status === 'pending');
  const approved = categories.filter((c) => c.status === 'approved');

  // Get the display name for a skill (edited or original)
  function getSkillName(catId: number, originalSkill: string): string {
    const key = `${catId}-${originalSkill}`;
    return editedSkills[key] ?? originalSkill;
  }

  function toggleSkill(catId: number, skill: string): void {
    setSelectedSkills((prev) => {
      const current = prev[catId] || [];
      return {
        ...prev,
        [catId]: current.includes(skill)
          ? current.filter((s) => s !== skill)
          : [...current, skill],
      };
    });
  }

  function selectAllSkills(catId: number, skills: string[]): void {
    setSelectedSkills((prev) => ({ ...prev, [catId]: [...skills] }));
  }

  function deselectAllSkills(catId: number): void {
    setSelectedSkills((prev) => ({ ...prev, [catId]: [] }));
  }

  // Get existing skill names for a target category (for dedup display)
  function getExistingSkillNames(targetCatId: number | null): Set<string> {
    if (!targetCatId) return new Set();
    const cat = categories.find((c) => c.id === targetCatId);
    if (!cat) return new Set();
    return new Set(cat.skills.map((s) => s.name.toLowerCase()));
  }

  async function handleApprove(id: number, originalName: string): Promise<void> {
    setLoading(id);
    setFeedbackMsg(null);
    try {
      const edited = editedNames[id];
      const nameChanged = edited && edited.trim() !== originalName;
      // Resolve edited skill names for selected skills
      const rawSelected = selectedSkills[id] || [];
      const approvedSkills = rawSelected.map((s) => getSkillName(id, s));
      const res = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          action: 'approve',
          approvedSkills,
          ...(nameChanged ? { newName: edited.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMsg(data.message);
      } else {
        setFeedbackMsg(data.error || 'Error al aprobar');
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handleReassign(pendingCatId: number): Promise<void> {
    const targetCatId = reassignCatId[pendingCatId];
    if (!targetCatId) return;
    setLoading(pendingCatId);
    setFeedbackMsg(null);
    try {
      const rawSelected = selectedSkills[pendingCatId] || [];
      const approvedSkills = rawSelected.map((s) => getSkillName(pendingCatId, s));
      const res = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pendingCatId,
          action: 'reassign',
          existingCategoryId: targetCatId,
          approvedSkills,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMsg(data.message);
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  function toggleExpand(id: number): void {
    setExpandedId(expandedId === id ? null : id);
  }

  return (
    <div className="space-y-8">
      {/* Feedback */}
      {feedbackMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm">
          {feedbackMsg}
        </div>
      )}

      {/* Pending Categories */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Categorías Pendientes ({pendingCategories.length})
        </h2>
        {pendingCategories.length === 0 ? (
          <p className="text-gray-500">No hay categorías pendientes de aprobación.</p>
        ) : (
          <div className="space-y-4">
            {pendingCategories.map((cat) => (
              <div
                key={cat.id}
                className="border border-yellow-200 bg-yellow-50 rounded-lg overflow-hidden"
              >
                {/* Header row */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-lg">
                        &quot;{cat.name}&quot;
                      </p>
                      {cat.related_project && (
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                          Proyecto vinculado
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      Sugerida por: {cat.suggested_by_name || cat.suggested_by_email || 'Desconocido'}
                      {' · '}
                      {new Date(cat.created_at).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleExpand(cat.id)}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-white transition-colors"
                  >
                    {expandedId === cat.id ? 'Cerrar' : 'Ver detalles'}
                  </button>
                </div>

                {/* Expanded project details */}
                {expandedId === cat.id && (
                  <div className="border-t border-yellow-200 bg-white p-5 space-y-5">
                    {cat.related_project ? (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                          Proyecto Asociado
                        </h4>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                          <div>
                            <span className="text-xs font-medium text-gray-500">Título</span>
                            <p className="text-gray-900 font-medium">{cat.related_project.title}</p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500">Descripción</span>
                            <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                              {cat.related_project.description}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-4">
                            <div>
                              <span className="text-xs font-medium text-gray-500">Categoría actual</span>
                              <p className="text-sm">
                                <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">
                                  {cat.related_project.category}
                                </span>
                              </p>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-500">Presupuesto</span>
                              <p className="text-sm font-semibold text-blue-600">
                                {formatCOP(parseFloat(cat.related_project.budget))}
                              </p>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-500">Publicado por</span>
                              <p className="text-sm text-gray-700">{cat.related_project.employer_name}</p>
                            </div>
                          </div>
                          {cat.related_project.skills_required?.length > 0 && (
                            <div>
                              <span className="text-xs font-medium text-gray-500">Habilidades</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {cat.related_project.skills_required.map((skill) => (
                                  <span
                                    key={skill}
                                    className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">
                        No se encontró un proyecto vinculado a esta sugerencia.
                      </p>
                    )}

                    {/* Suggested Skills */}
                    {cat.suggested_skills && cat.suggested_skills.length > 0 && (() => {
                      const targetCatId = reassignCatId[cat.id];
                      const existingNames = getExistingSkillNames(targetCatId ?? null);

                      return (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                              Habilidades Sugeridas por el Usuario
                            </h4>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => selectAllSkills(cat.id, cat.suggested_skills!.filter(
                                  (s) => !existingNames.has(getSkillName(cat.id, s).toLowerCase())
                                ))}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Seleccionar nuevas
                              </button>
                              <button
                                type="button"
                                onClick={() => deselectAllSkills(cat.id)}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                Ninguna
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {cat.suggested_skills.map((skill) => {
                              const skillKey = `${cat.id}-${skill}`;
                              const displayName = getSkillName(cat.id, skill);
                              const isDuplicate = existingNames.has(displayName.toLowerCase());
                              const isSelected = (selectedSkills[cat.id] || []).includes(skill);
                              const isEditing = editingSkillKey === skillKey;

                              if (isEditing) {
                                return (
                                  <div key={skill} className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={editedSkills[skillKey] ?? skill}
                                      onChange={(e) => setEditedSkills({ ...editedSkills, [skillKey]: e.target.value })}
                                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingSkillKey(null); }}
                                      className="px-2 py-1 text-sm border border-blue-400 rounded focus:ring-1 focus:ring-blue-500 w-40"
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setEditingSkillKey(null)}
                                      className="text-xs text-blue-600 hover:text-blue-800"
                                    >
                                      OK
                                    </button>
                                  </div>
                                );
                              }

                              return (
                                <div key={skill} className="flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() => !isDuplicate && toggleSkill(cat.id, skill)}
                                    className={`px-3 py-1 rounded-l-full text-sm border transition-colors ${
                                      isDuplicate
                                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-default line-through'
                                        : isSelected
                                          ? 'bg-green-600 text-white border-green-600'
                                          : 'bg-white text-gray-700 border-gray-300 hover:border-green-500'
                                    }`}
                                    title={isDuplicate ? 'Ya existe en la categoría destino' : ''}
                                  >
                                    {isDuplicate ? '— ' : isSelected ? '✓ ' : ''}{displayName}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setEditingSkillKey(skillKey); if (!editedSkills[skillKey]) setEditedSkills({ ...editedSkills, [skillKey]: skill }); }}
                                    className={`px-1.5 py-1 text-xs border border-l-0 rounded-r-full transition-colors ${
                                      isDuplicate
                                        ? 'bg-gray-100 text-gray-400 border-gray-200'
                                        : isSelected
                                          ? 'bg-green-700 text-green-100 border-green-600 hover:bg-green-800'
                                          : 'bg-white text-gray-400 border-gray-300 hover:text-blue-600'
                                    }`}
                                    title="Editar nombre"
                                  >
                                    ✎
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-xs text-gray-400 mt-2">
                            {targetCatId
                              ? 'Las tachadas ya existen en la categoría destino y se omitirán. Clic en ✎ para editar.'
                              : 'Selecciona las que quieras aprobar. Clic en ✎ para editar el nombre.'}
                          </p>
                        </div>
                      );
                    })()}

                    {/* Actions */}
                    <div className="space-y-4 pt-2">
                      {/* Approve - edit name + create category and assign to project */}
                      <div>
                        <p className="text-sm text-gray-600 mb-2">
                          Nombre de la categoría a aprobar (puedes editarlo):
                        </p>
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            value={editedNames[cat.id] ?? cat.name}
                            onChange={(e) =>
                              setEditedNames({ ...editedNames, [cat.id]: e.target.value })
                            }
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                          <button
                            onClick={() => handleApprove(cat.id, cat.name)}
                            disabled={loading === cat.id}
                            className="px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 shrink-0"
                          >
                            Aprobar{cat.related_project ? ' y asignar' : ''}
                          </button>
                        </div>
                        {editedNames[cat.id] && editedNames[cat.id].trim() !== cat.name && (
                          <p className="text-xs text-green-700 mt-1">
                            Se aprobará como: &quot;{editedNames[cat.id].trim()}&quot;
                          </p>
                        )}
                      </div>

                      {/* Reassign - map to existing category */}
                      {cat.related_project && (
                        <div className="border-t border-gray-200 pt-4">
                          <p className="text-sm text-gray-600 mb-2">
                            O reasignar el proyecto a una categoría existente:
                          </p>
                          <div className="flex items-center gap-2">
                            <select
                              value={reassignCatId[cat.id] || ''}
                              onChange={(e) =>
                                setReassignCatId({
                                  ...reassignCatId,
                                  [cat.id]: e.target.value ? parseInt(e.target.value, 10) : null,
                                })
                              }
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                            >
                              <option value="">Seleccionar categoría existente...</option>
                              {approvedCategories.map((ac) => (
                                <option key={ac.id} value={ac.id}>
                                  {ac.name}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleReassign(cat.id)}
                              disabled={loading === cat.id || !reassignCatId[cat.id]}
                              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                              Reasignar
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Esto actualizará la categoría del proyecto y eliminará la sugerencia.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approved Categories */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Categorías Aprobadas ({approved.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {approved.map((cat) => (
            <div
              key={cat.id}
              className="p-4 border border-gray-200 rounded-lg"
            >
              <p className="font-medium text-gray-900">{cat.name}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {cat.skills.map((skill) => (
                  <span
                    key={skill.id}
                    className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded"
                  >
                    {skill.name}
                  </span>
                ))}
                {cat.skills.length === 0 && (
                  <span className="text-xs text-gray-400">Sin habilidades predefinidas</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
