'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ApplyModal from './ApplyModal';
import EditProjectModal from './EditProjectModal';
import ProjectCloseButton from './ProjectCloseButton';
import ProjectDeleteButton from './ProjectDeleteButton';
import Modal from './Modal';

interface UserApplication {
  id: number;
  proposal: string;
  bid: string | null;
  status: string;
  created_at: string;
}

interface ProjectActionsProps {
  project: {
    id: number;
    title: string;
    description: string;
    category: string;
    budget: string;
    budget_currency: string;
    skills_required: string[];
    status: string;
  };
  isOwner: boolean;
  isAuthenticated: boolean;
  hasApplied: boolean;
  userApplication?: UserApplication | null;
}

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function parseCOPInput(formatted: string): number {
  const cleaned = formatted.replace(/\D/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}

function formatCOPInput(value: number | string): string {
  const num = typeof value === 'string' ? parseInt(value.replace(/\D/g, ''), 10) : value;
  if (isNaN(num) || num === 0) return '';
  return new Intl.NumberFormat('es-CO').format(num);
}

export default function ProjectActions({ project, isOwner, isAuthenticated, hasApplied, userApplication }: ProjectActionsProps) {
  const router = useRouter();
  const [showApply, setShowApply] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showEditApp, setShowEditApp] = useState(false);
  const [isDeletingApp, setIsDeletingApp] = useState(false);

  // Edit application state
  const [editProposal, setEditProposal] = useState(userApplication?.proposal || '');
  const [editBidDisplay, setEditBidDisplay] = useState(
    userApplication?.bid ? formatCOPInput(parseFloat(userApplication.bid)) : ''
  );
  const [editBidValue, setEditBidValue] = useState<number | undefined>(
    userApplication?.bid ? parseFloat(userApplication.bid) : undefined
  );
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function handleEditBidChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const numericValue = parseCOPInput(e.target.value);
    setEditBidDisplay(formatCOPInput(numericValue));
    setEditBidValue(numericValue > 0 ? numericValue : undefined);
  }

  function openEditApp(): void {
    setEditProposal(userApplication?.proposal || '');
    setEditBidDisplay(userApplication?.bid ? formatCOPInput(parseFloat(userApplication.bid)) : '');
    setEditBidValue(userApplication?.bid ? parseFloat(userApplication.bid) : undefined);
    setEditError(null);
    setShowEditApp(true);
  }

  async function saveEditApp(): Promise<void> {
    if (!userApplication) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/applications/${userApplication.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal: editProposal, bid: editBidValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Error al actualizar');
      setShowEditApp(false);
      router.refresh();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setEditSubmitting(false);
    }
  }

  async function deleteApp(): Promise<void> {
    if (!userApplication) return;
    if (!confirm('¿Eliminar tu aplicación a este proyecto?')) return;
    setIsDeletingApp(true);
    try {
      const res = await fetch(`/api/applications/${userApplication.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(typeof data.error === 'string' ? data.error : 'Error al eliminar');
        return;
      }
      router.refresh();
    } catch {
      alert('Error al eliminar aplicación');
    } finally {
      setIsDeletingApp(false);
    }
  }

  return (
    <>
      {/* Apply - all authenticated users, open project, not yet applied */}
      {isAuthenticated && project.status === 'open' && !hasApplied && (
        <div className="pt-5 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setShowApply(true)}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all"
          >
            Aplicar a este Proyecto
          </button>
        </div>
      )}

      {/* Already applied — show application summary with edit/delete */}
      {isAuthenticated && hasApplied && userApplication && (
        <div className="pt-5 border-t border-gray-100">
          <div className="p-4 bg-green-50/50 rounded-xl border border-green-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-green-700">Tu aplicación</span>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                userApplication.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                userApplication.status === 'accepted' ? 'bg-green-100 text-green-700' :
                'bg-red-50 text-red-700'
              }`}>
                {userApplication.status}
              </span>
            </div>

            <p className="text-sm text-gray-600 line-clamp-3 mb-2">{userApplication.proposal}</p>

            {userApplication.bid && (
              <p className="text-sm font-medium text-blue-600 mb-3">
                Oferta: {formatCOP(parseFloat(userApplication.bid))}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={openEditApp}
                className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={deleteApp}
                disabled={isDeletingApp}
                className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors"
              >
                {isDeletingApp ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Not authenticated */}
      {!isAuthenticated && project.status === 'open' && (
        <div className="pt-5 border-t border-gray-100">
          <p className="text-sm text-gray-500 mb-3">Inicia sesión para aplicar.</p>
          <a
            href="/login"
            className="inline-block px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            Iniciar Sesión
          </a>
        </div>
      )}

      {/* Owner actions */}
      {isOwner && (
        <div className="pt-5 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowEdit(true)}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
            >
              Editar
            </button>
            {project.status === 'open' && (
              <ProjectCloseButton projectId={project.id} />
            )}
            <ProjectDeleteButton projectId={project.id} />
          </div>
        </div>
      )}

      {/* Modals */}
      <ApplyModal
        isOpen={showApply}
        onClose={() => setShowApply(false)}
        projectId={project.id}
        projectTitle={project.title}
        projectBudget={parseFloat(project.budget)}
        projectCurrency={project.budget_currency || 'COP'}
      />

      <EditProjectModal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        project={project}
      />

      {/* Edit application modal */}
      <Modal isOpen={showEditApp} onClose={() => setShowEditApp(false)} title="Editar Aplicación">
        <div className="space-y-4">
          {editError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-sm text-red-700">{editError}</p>
            </div>
          )}

          <div>
            <label htmlFor="editAppProposal" className="block text-sm font-medium text-gray-700 mb-1.5">
              Tu Propuesta
            </label>
            <textarea
              id="editAppProposal"
              value={editProposal}
              onChange={(e) => setEditProposal(e.target.value)}
              rows={5}
              placeholder="Incluye tus datos de contacto: teléfono, WhatsApp, email u otro medio."
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-shadow"
            />
            <p className={`mt-1 text-xs ${editProposal.length >= 50 ? 'text-green-600' : 'text-gray-400'}`}>
              {editProposal.length}/50 caracteres mínimo
            </p>
          </div>

          <div>
            <label htmlFor="editAppBid" className="block text-sm font-medium text-gray-700 mb-1.5">
              Oferta (COP) — opcional
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                id="editAppBid"
                type="text"
                inputMode="numeric"
                value={editBidDisplay}
                onChange={handleEditBidChange}
                placeholder="300.000"
                className="w-full pl-8 pr-14 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">COP</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={saveEditApp}
              disabled={editSubmitting || editProposal.length < 50}
              className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {editSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            <button
              type="button"
              onClick={() => setShowEditApp(false)}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
