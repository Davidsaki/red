'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from './Modal';

interface ApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  projectTitle: string;
  projectBudget: number;
  projectCurrency: string;
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

export default function ApplyModal({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  projectBudget,
  projectCurrency,
}: ApplyModalProps) {
  const router = useRouter();
  const [proposal, setProposal] = useState('');
  const [customBid, setCustomBid] = useState(false);
  const [bidDisplay, setBidDisplay] = useState(formatCOPInput(projectBudget));
  const [bidValue, setBidValue] = useState<number>(projectBudget);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleBidChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const raw = e.target.value;
    const numericValue = parseCOPInput(raw);
    setBidDisplay(formatCOPInput(numericValue));
    setBidValue(numericValue);
  }

  function handleToggleBid(checked: boolean): void {
    setCustomBid(checked);
    if (!checked) {
      setBidValue(projectBudget);
      setBidDisplay(formatCOPInput(projectBudget));
    }
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          proposal,
          bid: bidValue > 0 ? bidValue : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Error al enviar aplicación');
      }

      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar aplicación');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose(): void {
    setProposal('');
    setCustomBid(false);
    setBidValue(projectBudget);
    setBidDisplay(formatCOPInput(projectBudget));
    setError(null);
    setSuccess(false);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Aplicar al Proyecto">
      {success ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Aplicación Enviada</h3>
          <p className="text-sm text-gray-500 mb-4">Tu propuesta fue enviada exitosamente.</p>
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
          {/* Project context */}
          <div className="mb-4 p-3 bg-gray-50 rounded-xl">
            <p className="text-sm font-medium text-gray-900">{projectTitle}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Presupuesto: {formatCOP(projectBudget)} {projectCurrency}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Proposal */}
            <div>
              <label htmlFor="proposal" className="block text-sm font-medium text-gray-700 mb-1.5">
                Tu Propuesta
              </label>
              <textarea
                id="proposal"
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                rows={5}
                placeholder={"Describe tu experiencia, cómo abordarías el proyecto, y por qué eres la persona indicada.\n\nIncluye tus datos de contacto: teléfono, WhatsApp, email u otro medio por el que te puedan contactar."}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-shadow"
              />
              <p className={`mt-1 text-xs ${proposal.length >= 50 ? 'text-green-600' : 'text-gray-400'}`}>
                {proposal.length}/50 caracteres mínimo
              </p>
            </div>

            {/* Bid with checkbox */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="customBid"
                  checked={customBid}
                  onChange={(e) => handleToggleBid(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="customBid" className="text-sm font-medium text-gray-700">
                  Modificar oferta
                </label>
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
                    customBid
                      ? 'bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      : 'bg-gray-50 text-gray-500 cursor-not-allowed'
                  }`}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">COP</span>
              </div>
              {!customBid && (
                <p className="mt-1 text-xs text-gray-400">
                  Oferta igual al presupuesto del proyecto
                </p>
              )}
            </div>

            {/* Actions */}
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
