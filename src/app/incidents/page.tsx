'use client';

import { useEffect, useState, useCallback } from 'react';
import { Incident } from '@/types/incident';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchIncidents = useCallback(() => {
    fetch('/api/incidents')
      .then((res) => res.json())
      .then((data) => {
        setIncidents(data.incidents || []);
        setLoading(false);
        setLastRefresh(new Date());
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchIncidents, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchIncidents]);

  const statusColors: Record<string, string> = {
    in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    completed: 'bg-green-100 text-green-800 border-green-300',
    submitted: 'bg-blue-100 text-blue-800 border-blue-300',
    error: 'bg-red-100 text-red-800 border-red-300',
  };

  const statusLabels: Record<string, string> = {
    in_progress: 'En Progreso',
    completed: 'Completada',
    submitted: 'Enviada',
    error: 'Error',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Incidencias — Debug</h1>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400">
            {lastRefresh.toLocaleTimeString('es-ES')}
          </span>
          <button
            onClick={fetchIncidents}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded border transition-colors"
          >
            Refrescar
          </button>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto (3s)
          </label>
        </div>
      </div>

      {loading && <p className="text-gray-500">Cargando...</p>}

      {!loading && incidents.length === 0 && (
        <div className="bg-white rounded-lg border p-8 text-center">
          <p className="text-gray-500 mb-2">No hay incidencias registradas</p>
          <p className="text-sm text-gray-400">
            Las incidencias apareceran aqui cuando el agente de voz procese conversaciones.
            Haz una webcall de prueba en HappyRobot para empezar.
          </p>
        </div>
      )}

      {incidents.length > 0 && (
        <div className="space-y-3">
          {incidents.map((incident) => (
            <div key={incident.id} className="bg-white rounded-lg border overflow-hidden">
              {/* Header row */}
              <button
                onClick={() => setExpandedId(expandedId === incident.id ? null : incident.id)}
                className="w-full px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
              >
                <span className="text-xs text-gray-400 font-mono w-20 shrink-0">
                  {incident.id.slice(0, 8)}
                </span>
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[incident.status] || ''}`}
                >
                  {statusLabels[incident.status] || incident.status}
                </span>
                <span className="text-sm font-medium">{incident.incidentType}</span>
                <div className="flex items-center gap-2 ml-auto">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${incident.completionPercentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-10 text-right">
                    {incident.completionPercentage}%
                  </span>
                  <span className="text-xs text-gray-400">
                    {incident.fields.length} campos
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(incident.updatedAt).toLocaleTimeString('es-ES')}
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === incident.id ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded detail */}
              {expandedId === incident.id && (
                <div className="border-t px-4 py-4 bg-gray-50">
                  {/* Metadata */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-xs">
                    <div>
                      <span className="text-gray-400 block">ID completo</span>
                      <span className="font-mono break-all">{incident.id}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Form ID</span>
                      <span className="font-mono">{incident.formId}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Vigilante</span>
                      <span>{incident.guardId}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Centro</span>
                      <span>{incident.centerId}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Session HR</span>
                      <span className="font-mono break-all">{incident.happyRobotSessionId || '—'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Creado</span>
                      <span>{new Date(incident.createdAt).toLocaleString('es-ES')}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Actualizado</span>
                      <span>{new Date(incident.updatedAt).toLocaleString('es-ES')}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Familia</span>
                      <span>{incident.incidentFamily}</span>
                    </div>
                  </div>

                  {/* Error message */}
                  {incident.errorMessage && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mb-4">
                      {incident.errorMessage}
                    </div>
                  )}

                  {/* Fields table */}
                  {incident.fields.length > 0 ? (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Campos ({incident.fields.length})</h3>
                      <div className="bg-white rounded border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 border-b">
                            <tr>
                              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">UID</th>
                              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Valor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {incident.fields.map((field, i) => (
                              <tr key={i} className="hover:bg-blue-50">
                                <td className="px-3 py-2 font-mono text-xs text-gray-500 w-80">
                                  {field.uid}
                                </td>
                                <td className="px-3 py-2">
                                  {field.value || <span className="text-gray-300 italic">vacio</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Sin campos registrados aun</p>
                  )}

                  {/* Raw JSON */}
                  <details className="mt-4">
                    <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                      Ver JSON raw
                    </summary>
                    <pre className="mt-2 bg-gray-900 text-green-400 text-xs p-3 rounded overflow-x-auto max-h-64 overflow-y-auto">
                      {JSON.stringify(incident, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
