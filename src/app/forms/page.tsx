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
  { id: 'hurto-generico', name: 'Hurto Generico' },
  { id: 'hurto-recuperacion', name: 'Hurto con Recuperacion' },
  { id: 'hurto-centro-comercial', name: 'Hurto en Centro Comercial' },
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
    <div>
      <h1 className="text-2xl font-bold mb-6">Formularios</h1>

      <div className="flex gap-3 mb-6">
        {FORMS.map((form) => (
          <button
            key={form.id}
            onClick={() => loadForm(form.id)}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              selectedForm === form.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {form.name}
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-500">Cargando formulario...</p>}

      {formData && selectedForm && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat label="Secciones" value={formData.stats.totalSections} />
            <MiniStat label="Raiz" value={formData.stats.rootSections} />
            <MiniStat label="Bifurcaciones" value={formData.stats.forkSections} />
            <MiniStat label="Profundidad max" value={formData.stats.maxForkDepth} />
            <MiniStat label="Total campos" value={formData.stats.totalFields} />
            <MiniStat label="Obligatorios" value={formData.stats.mandatoryFields} />
            <MiniStat label="Forks vacios" value={formData.stats.emptyForks} />
            <MiniStat label="Huerfanos" value={formData.stats.orphanedSections} />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => loadPrompt(selectedForm)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
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
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
            >
              Descargar Workflow JSON
            </button>
          </div>

          {/* Prompt Preview */}
          {promptPreview && (
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Prompt del Agente</h2>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-xs max-h-96">
                {promptPreview}
              </pre>
            </div>
          )}

          {/* Fields Table */}
          <div className="bg-white rounded-lg border overflow-hidden">
            <h2 className="text-lg font-semibold px-4 py-3 border-b">
              Campos ({formData.allFields.length})
            </h2>
            <div className="overflow-auto max-h-[600px]">
              <table className="w-full">
                <thead className="bg-gray-50 border-b sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Nivel</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Pregunta</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Tipo</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Oblig.</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Multi</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Opciones</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">UID</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {formData.allFields.map((field) => (
                    <tr
                      key={field.uid}
                      className={`hover:bg-gray-50 ${field.forkDepth > 0 ? 'bg-blue-50/30' : ''}`}
                    >
                      <td className="px-3 py-2 text-xs">
                        {'  '.repeat(field.forkDepth)}
                        {field.forkDepth > 0 ? `L${field.forkDepth}` : 'R'}
                      </td>
                      <td className="px-3 py-2">
                        <span style={{ paddingLeft: `${field.forkDepth * 16}px` }}>
                          {field.question}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {FIELD_TYPE_LABELS[field.fieldType] || field.fieldType}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {field.mandatory ? (
                          <span className="text-red-600 font-bold">Si</span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {field.multiple ? 'Si' : ''}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500 max-w-xs truncate">
                        {field.options.length > 0
                          ? field.options.join(', ')
                          : '-'}
                      </td>
                      <td className="px-3 py-2 text-xs font-mono text-gray-400 max-w-[200px] truncate">
                        {field.uid}
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

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg border px-3 py-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}
