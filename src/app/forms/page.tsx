'use client';

import { useState } from 'react';

interface AgentField {
  uid: string;
  question: string;
  type: string;
  mandatory: boolean;
  multiple?: boolean;
  options?: (string | { value: string; opens: string[] })[];
  condition?: { field: string; equals: string };
}

interface AgentFormResponse {
  formId: string;
  name: string;
  totalFields: number;
  mandatoryFields: number;
  fields: AgentField[];
}

type ViewMode = 'fields' | 'json';

export default function FormsPage() {
  const [formIdInput, setFormIdInput] = useState('');
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AgentFormResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('fields');

  const loadForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = formIdInput.trim();
    if (!id) return;

    setSubmittedId(id);
    setLoading(true);
    setError(null);
    setFormData(null);

    try {
      const res = await fetch(`/api/prosegur/forms/${id}/agent`);
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || `Error ${res.status}`);
        return;
      }
      const data: AgentFormResponse = await res.json();
      setFormData(data);
      setViewMode('fields');
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Formularios</h1>
        <p className="text-gray-500 mt-1">Consulta la definición de cualquier formulario Prosegur por su ID</p>
      </div>

      {/* Input */}
      <form onSubmit={loadForm} className="flex gap-3 mb-8">
        <div className="flex-1 max-w-xs">
          <input
            type="text"
            value={formIdInput}
            onChange={(e) => setFormIdInput(e.target.value)}
            placeholder="ID del formulario (ej: 76)"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !formIdInput.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
          Consultar
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          Formulario <strong>{submittedId}</strong> no encontrado: {error}
        </div>
      )}

      {/* Results */}
      {formData && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat label="Form ID" value={formData.formId} accent="gray" />
            <MiniStat label="Total campos" value={formData.totalFields} accent="blue" />
            <MiniStat label="Obligatorios" value={formData.mandatoryFields} accent="red" />
            <MiniStat label="Opcionales" value={formData.totalFields - formData.mandatoryFields} accent="gray" />
          </div>

          {/* View toggle + panel */}
          <div className="glass-card overflow-hidden">
            {/* Tab header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-gray-900">{formData.name || `Formulario ${formData.formId}`}</h2>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
                  {formData.fields.length} campos
                </span>
              </div>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium">
                <button
                  onClick={() => setViewMode('fields')}
                  className={`px-3 py-1.5 transition-colors ${viewMode === 'fields' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  Preguntas
                </button>
                <button
                  onClick={() => setViewMode('json')}
                  className={`px-3 py-1.5 transition-colors ${viewMode === 'json' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  JSON raw
                </button>
              </div>
            </div>

            {/* Fields table */}
            {viewMode === 'fields' && (
              <div className="overflow-auto max-h-[640px]">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '70px' }}>Nivel</th>
                      <th>Pregunta</th>
                      <th style={{ width: '90px' }}>Tipo</th>
                      <th style={{ width: '60px' }}>Oblig.</th>
                      <th style={{ width: '55px' }}>Multi</th>
                      <th>Opciones</th>
                      <th style={{ width: '180px' }}>UID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.fields.map((field) => {
                      const depth = field.condition ? 1 : 0;
                      const optionLabels = (field.options || []).map((o) =>
                        typeof o === 'string' ? o : `${o.value} →`
                      );
                      return (
                        <tr key={field.uid}>
                          <td className="text-xs text-center">
                            {depth > 0 ? (
                              <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-semibold">L{depth}</span>
                            ) : (
                              <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-semibold">R</span>
                            )}
                          </td>
                          <td className="text-sm">
                            <span style={{ paddingLeft: `${depth * 20}px` }} className="text-gray-800">
                              {depth > 0 && <span className="text-blue-300 mr-1.5">└</span>}
                              {field.question}
                            </span>
                            {field.condition && (
                              <div style={{ paddingLeft: `${depth * 20 + 14}px` }} className="text-[10px] text-blue-400 mt-0.5">
                                si &quot;{field.condition.equals}&quot;
                              </div>
                            )}
                          </td>
                          <td>
                            <span className="text-[11px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md">
                              {field.type}
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
                            {optionLabels.length > 0 ? (
                              <span className="line-clamp-2">{optionLabels.join(' · ')}</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="text-[11px] font-mono text-gray-400 max-w-[180px]">
                            <span className="break-all">{field.uid}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* JSON raw */}
            {viewMode === 'json' && (
              <div className="relative">
                <button
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(formData, null, 2))}
                  className="absolute top-3 right-3 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors z-10"
                >
                  Copiar
                </button>
                <pre className="bg-gray-900 text-gray-300 p-5 overflow-auto text-xs max-h-[640px] leading-relaxed">
                  {JSON.stringify(formData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: number | string; accent: string }) {
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
