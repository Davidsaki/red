'use client';

import MunicipalityCombobox, { type LocationValue } from '@/components/MunicipalityCombobox';
import { WORK_MODES, WORK_MODE_LABELS, type WorkMode } from '@/lib/validations';

interface WorkModeFieldsProps {
  workMode: WorkMode;
  onWorkModeChange: (mode: WorkMode) => void;
  location: LocationValue | null;
  onLocationChange: (location: LocationValue | null) => void;
  workModeError?: string;
  locationError?: string;
}

/** Selector de modalidad (segmentado) + ubicación, compartido por crear/editar proyecto. */
export default function WorkModeFields({
  workMode,
  onWorkModeChange,
  location,
  onLocationChange,
  workModeError,
  locationError,
}: WorkModeFieldsProps) {
  const required = workMode !== 'remote';

  return (
    <div className="space-y-4">
      <div>
        <span id="work-mode-label" className="block text-sm font-medium text-gray-700 mb-1">
          Modalidad de trabajo *
        </span>
        <div
          role="radiogroup"
          aria-labelledby="work-mode-label"
          className="inline-flex w-full sm:w-auto rounded-md border border-gray-300 overflow-hidden"
        >
          {WORK_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={workMode === mode}
              onClick={() => onWorkModeChange(mode)}
              className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium transition-colors border-r last:border-r-0 border-gray-300 ${
                workMode === mode ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {WORK_MODE_LABELS[mode]}
            </button>
          ))}
        </div>
        {workModeError && <p className="mt-1 text-sm text-red-600">{workModeError}</p>}
      </div>

      <div>
        <label htmlFor="project-location" className="block text-sm font-medium text-gray-700 mb-1">
          Ubicación {required ? '*' : '(opcional)'}
        </label>
        <MunicipalityCombobox
          id="project-location"
          value={location}
          onChange={onLocationChange}
          hasError={!!locationError}
        />
        {locationError && <p className="mt-1 text-sm text-red-600">{locationError}</p>}
      </div>
    </div>
  );
}
