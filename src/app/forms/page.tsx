'use client';

import { useState } from 'react';
import { FIELD_TYPE_LABELS } from '@/types/form';

interface FormField {
  uid: string;
  question: string;
  fieldType: string;
  mandatory: boolean;
  multiple: boolean;
  options: string[];
  forkDepth: number;
  sectionGuid: string;
}

interface FormStats {
  totalSections: number;
  rootSections: number;
  forkSections: number;
  emptyForks: number;
  orphanedSections: number;
  totalFields: number;
  mandatoryFields: number;
  maxForkDepth: number;
}

interface ProcessedFormData {
  stats: FormStats;
  allFields: FormField[];
  mandatoryFields: { uid: string; question: string }[];
  orphanedSections: { sectionGuid: string; parentSectionGuid: string | null; fieldCount: number }[];
}

const FORMS = [
  { id: 'hurto-generico', name: 'Hurto Generico', icon: '1' },
  { id: 'hurto-recuperacion', name: 'Hurto con Recuperacion', icon: '2' },
  { id: 'hurto-centro-comercial', name: 'Hurto en Centro Comercial', icon: '3' },
];

export default function FormsPage() {
  const [selectedForm, setSelectedForm] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProcessedFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [promptPreview, setPromptPreview] = useState<string | null>(null);

  const loadForm = async (formId: string) => {
    setSelectedForm(formId);
    setLoading(true);
    setPromptPreview(null);

    try {
      const res = await fetch('/api/forms/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form_id: formId }),
      });
      const data = await res.json();
      setFormData(data);
    } catch (err) {
      console.error('Error loading form:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPrompt = async (formId: string) => {
    try {
      const res = await fetch('/api/prompts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_id: formId,
          incident_type: FORMS.find((f) => f.id === formId)?.name || formId,
          incident_family: 'Hurto',
        }),
      });
      const data = await res.json();
      setPromptPreview(data.agent_prompt);
    } catch (err) {
      console.error('Error loading prompt:', err);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Formularios</h1>
        <p className="text-gray-500 mt-1">Estructura y configuracion de formularios de incidencia</p>
      </div>

      {/* Form Selector */}
      <div className="flex gap-3 mb-8">
        {FORMS.map((form) => (
          <button
            key={form.id}
            onClick={() => loadForm(form.id)}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
              selectedForm === form.id
                ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm'
            }`}
          >
            <span className={`w-6 h-6 rounded-lg text-xs flex items-center justify-center font-bold ${
              selectedForm === form.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {form.icon}
            </span>
            {form.name}
          </button>
        ))}
      </div>

      {loading && (
        <div className="glass-card p-12 text-center">
          <div className="inline-block w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-gray-400 mt-3 text-sm">Cargando formulario...</p>
        </div>
      )}

      {formData && selectedForm && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat label="Secciones" value={formData.stats.totalSections} accent="blue" />
            <MiniStat label="Raiz" value={formData.stats.rootSections} accent="gray" />
            <MiniStat label="Bifurcaciones" value={formData.stats.forkSections} accent="violet" />
            <MiniStat label="Profundidad max" value={formData.stats.maxForkDepth} accent="amber" />
            <MiniStat label="Total campos" value={formData.stats.totalFields} accent="blue" />
            <MiniStat label="Obligatorios" value={formData.stats.mandatoryFields} accent="red" />
            <MiniStat label="Forks vacios" value={formData.stats.emptyForks} accent="gray" />
            <MiniStat label="Huerfanos" value={formData.stats.orphanedSections} accent="amber" />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => loadPrompt(selectedForm)}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm font-semibold transition-all shadow-sm shadow-emerald-600/20"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Ver Prompt Generado
            </button>
            <button
              onClick={async () => {
                const res = await fetch('/api/workflows/generate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    form_id: selectedForm,
                    incident_type: FORMS.find((f) => f.id === selectedForm)?.name || selectedForm,
                    incident_family: 'Hurto',
                  }),
                });
                const workflow = await res.json();
                const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `workflow-${selectedForm}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 text-sm font-semibold transition-all shadow-sm shadow-violet-600/20"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar Workflow JSON
            </button>
          </div>

          {/* Prompt Preview */}
          {promptPreview && (
            <div className="glass-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">Prompt del Agente</h2>
                </div>
                <button
                  onClick={() => setPromptPreview(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <pre className="bg-gray-900 text-gray-300 p-5 overflow-auto text-xs max-h-96 leading-relaxed">
                {promptPreview}
              </pre>
            </div>
          )}

          {/* Fields Table */}
          <div className="glass-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-gray-900">Campos</h2>
              <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
                {formData.allFields.length}
              </span>
            </div>
            <div className="overflow-auto max-h-[600px]">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>Nivel</th>
                    <th>Pregunta</th>
                    <th style={{ width: '90px' }}>Tipo</th>
                    <th style={{ width: '60px' }}>Oblig.</th>
                    <th style={{ width: '55px' }}>Multi</th>
                    <th>Opciones</th>
                    <th style={{ width: '180px' }}>UID</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.allFields.map((field) => (
                    <tr key={field.uid}>
                      <td className="text-xs text-center">
                        {field.forkDepth > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-blue-400">{'  '.repeat(field.forkDepth)}</span>
                            <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-semibold">
                              L{field.forkDepth}
                            </span>
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-semibold">R</span>
                        )}
                      </td>
                      <td className="text-sm">
                        <span style={{ paddingLeft: `${field.forkDepth * 20}px` }} className="text-gray-800">
                          {field.forkDepth > 0 && (
                            <span className="text-blue-300 mr-1.5">{'└'.repeat(1)}</span>
                          )}
                          {field.question}
                        </span>
                      </td>
                      <td>
                        <span className="text-[11px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md">
                          {FIELD_TYPE_LABELS[field.fieldType] || field.fieldType}
                        </span>
                      </td>
                      <td className="text-center">
                        {field.mandatory ? (
                          <span className="inline-block w-5 h-5 rounded-full bg-red-50 text-red-500 text-[10px] font-bold leading-5 text-center">!</span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="text-center">
                        {field.multiple ? (
                          <span className="text-blue-500 text-xs font-semibold">Si</span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="text-xs text-gray-500 max-w-xs">
                        {field.options.length > 0 ? (
                          <span className="line-clamp-2">{field.options.join(' · ')}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="text-[11px] font-mono text-gray-400 max-w-[180px]">
                        <span className="break-all">{field.uid}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent: string }) {
  const accentColors: Record<string, string> = {
    blue: 'text-blue-600',
    violet: 'text-violet-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
    gray: 'text-gray-700',
  };

  return (
    <div className="stat-card stat-blue p-4 card-hover">
      <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-bold mt-0.5 ${accentColors[accent] || 'text-gray-700'}`}>{value}</div>
    </div>
  );
}
