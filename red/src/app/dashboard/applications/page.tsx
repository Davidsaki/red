'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Application {
  id: number;
  project_id: number;
  proposal: string;
  bid: string | null;
  status: string;
  created_at: string;
  project_title: string;
  project_budget: string;
  project_budget_currency: string;
  project_status: string;
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

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) return `hace ${Math.floor(diffDays / 30)} mes(es)`;
  if (diffDays > 0) return `hace ${diffDays} día(s)`;
  if (diffHours > 0) return `hace ${diffHours} hora(s)`;
  if (diffMins > 0) return `hace ${diffMins} minuto(s)`;
  return 'ahora mismo';
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50/80 flex items-center justify-center">
        <p className="text-sm text-gray-400">Cargando...</p>
      </div>
    }>
      <ApplicationsContent />
    </Suspense>
  );
}

function ApplicationsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get('projectId');

  // Apply mode state
  const [projectInfo, setProjectInfo] = useState<{ id: number; title: string; budget: string; budget_currency: string } | null>(null);
  const [proposal, setProposal] = useState('');
  const [customBid, setCustomBid] = useState(false);
  const [bidDisplay, setBidDisplay] = useState('');
  const [bidValue, setBidValue] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // List mode state
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit mode state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editProposal, setEditProposal] = useState('');
  const [editBidDisplay, setEditBidDisplay] = useState('');
  const [editBidValue, setEditBidValue] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (projectId) {
      fetch(`/api/projects/${projectId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setProjectInfo(data.project);
            const budget = parseFloat(data.project.budget);
            setBidValue(budget);
            setBidDisplay(formatCOPInput(budget));
          }
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    } else {
      fetchApplications();
    }
  }, [projectId]);

  async function fetchApplications(): Promise<void> {
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      if (data.success) setApplications(data.applications);
    } catch { /* ignore */ } finally {
      setIsLoading(false);
    }
  }

  function handleBidChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const numericValue = parseCOPInput(e.target.value);
    setBidDisplay(formatCOPInput(numericValue));
    setBidValue(numericValue);
  }

  function handleToggleBid(checked: boolean): void {
    setCustomBid(checked);
    if (!checked && projectInfo) {
      const budget = parseFloat(projectInfo.budget);
      setBidValue(budget);
      setBidDisplay(formatCOPInput(budget));
    }
  }

  async function handleSubmitApplication(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!projectId) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: parseInt(projectId, 10),
          proposal,
          bid: bidValue > 0 ? bidValue : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Error al enviar');
      setSubmitSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al enviar');
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(app: Application): void {
    setEditingId(app.id);
    setEditProposal(app.proposal);
    if (app.bid) {
      setEditBidDisplay(formatCOPInput(parseFloat(app.bid)));
      setEditBidValue(parseFloat(app.bid));
    } else {
      setEditBidDisplay('');
      setEditBidValue(undefined);
    }
  }

  function handleEditBidChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const numericValue = parseCOPInput(e.target.value);
    setEditBidDisplay(formatCOPInput(numericValue));
    setEditBidValue(numericValue > 0 ? numericValue : undefined);
  }

  async function saveEdit(appId: number): Promise<void> {
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal: editProposal, bid: editBidValue }),
      });
      if (!res.ok) { const d = await res.json(); alert(typeof d.error === 'string' ? d.error : 'Error'); return; }
      setEditingId(null);
      await fetchApplications();
    } catch { alert('Error al actualizar'); }
  }

  async function handleDelete(appId: number): Promise<void> {
    if (!confirm('¿Eliminar esta aplicación?')) return;
    try {
      const res = await fetch(`/api/applications/${appId}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); alert(typeof d.error === 'string' ? d.error : 'Error'); return; }
      await fetchApplications();
    } catch { alert('Error al eliminar'); }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/80 flex items-center justify-center">
        <p className="text-sm text-gray-400">Cargando...</p>
      </div>
    );
  }

  // ── APPLY MODE ──
  if (projectId) {
    if (submitSuccess) {
      return (
        <div className="min-h-screen bg-gray-50/80 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-gray-900 mb-1">Aplicación Enviada</h1>
            <p className="text-sm text-gray-500 mb-5">Tu propuesta fue enviada exitosamente.</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Link href={`/projects/${projectId}`} className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                Volver al Proyecto
              </Link>
              <Link href="/dashboard/applications" className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                Mis Aplicaciones
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50/80 py-6 px-4">
        <div className="max-w-lg mx-auto">
          <Link href={`/projects/${projectId}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </Link>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-7">
            <h1 className="text-xl font-semibold text-gray-900 mb-4">Aplicar al Proyecto</h1>

            {projectInfo && (
              <div className="mb-5 p-3.5 bg-gray-50 rounded-xl">
                <p className="text-sm font-medium text-gray-900">{projectInfo.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">Presupuesto: {formatCOP(parseFloat(projectInfo.budget))}</p>
              </div>
            )}

            {submitError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            )}

            <form onSubmit={handleSubmitApplication} className="space-y-4">
              <div>
                <label htmlFor="proposal" className="block text-sm font-medium text-gray-700 mb-1.5">Tu Propuesta</label>
                <textarea
                  id="proposal"
                  value={proposal}
                  onChange={(e) => setProposal(e.target.value)}
                  rows={6}
                  placeholder={"Describe tu experiencia, cómo abordarías el proyecto, y por qué eres la persona indicada.\n\nIncluye tus datos de contacto: teléfono, WhatsApp, email u otro medio por el que te puedan contactar."}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-shadow"
                />
                <p className={`mt-1 text-xs ${proposal.length >= 50 ? 'text-green-600' : 'text-gray-400'}`}>
                  {proposal.length}/50 caracteres mínimo
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="customBidPage"
                    checked={customBid}
                    onChange={(e) => handleToggleBid(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="customBidPage" className="text-sm font-medium text-gray-700">Modificar oferta</label>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={bidDisplay}
                    onChange={handleBidChange}
                    disabled={!customBid}
                    className={`w-full pl-8 pr-14 py-2.5 border border-gray-200 rounded-xl text-sm transition-all ${
                      customBid ? 'bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent' : 'bg-gray-50 text-gray-500 cursor-not-allowed'
                    }`}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">COP</span>
                </div>
                {!customBid && (
                  <p className="mt-1 text-xs text-gray-400">Oferta igual al presupuesto del proyecto</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || proposal.length < 50}
                  className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar Aplicación'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
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

  // ── LIST MODE ──
  return (
    <div className="min-h-screen bg-gray-50/80 py-6 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-semibold text-gray-900">Mis Aplicaciones</h1>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            ← Dashboard
          </Link>
        </div>

        {applications.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <p className="text-sm text-gray-400 mb-3">No has aplicado a ningún proyecto aún.</p>
            <Link href="/projects" className="inline-block px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
              Buscar Proyectos
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <div key={app.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
                {editingId === app.id ? (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900">{app.project_title}</h3>
                    <textarea
                      value={editProposal}
                      onChange={(e) => setEditProposal(e.target.value)}
                      rows={4}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editBidDisplay}
                        onChange={handleEditBidChange}
                        placeholder="Oferta (opcional)"
                        className="w-full pl-8 pr-14 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">COP</span>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => saveEdit(app.id)} className="px-3.5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
                        Guardar
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className="px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <Link href={`/projects/${app.project_id}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                          {app.project_title}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                            app.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                            app.status === 'accepted' ? 'bg-green-50 text-green-700' :
                            'bg-red-50 text-red-700'
                          }`}>
                            {app.status}
                          </span>
                          <span className="text-xs text-gray-400">{timeAgo(app.created_at)}</span>
                        </div>
                      </div>
                      {app.bid && (
                        <span className="text-sm font-semibold text-blue-600 ml-3 shrink-0">
                          {formatCOP(parseFloat(app.bid))}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{app.proposal}</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => startEdit(app)} className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        Editar
                      </button>
                      <button type="button" onClick={() => handleDelete(app.id)} className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
