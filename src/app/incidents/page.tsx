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

  const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    in_progress: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400', label: 'En Progreso' },
    completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400', label: 'Completada' },
    submitted: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400', label: 'Enviada' },
    error: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400', label: 'Error' },
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 90) return 'bg-emerald-500';
    if (pct >= 60) return 'bg-blue-500';
    if (pct >= 30) return 'bg-amber-500';
    return 'bg-red-400';
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Incidencias</h1>
          <p className="text-gray-500 mt-1">Monitoreo en tiempo real de incidencias procesadas</p>
        </div>
        <div className="flex items-center gap-3">
          {autoRefresh && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />
              Live
            </div>
          )}
          <span className="text-xs text-gray-400 font-mono">
            {lastRefresh.toLocaleTimeString('es-ES')}
          </span>
          <button
            onClick={fetchIncidents}
            className="px-3.5 py-2 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 transition-all hover:shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <label className="flex items-center gap-2 text-sm text-gray-500 bg-white px-3 py-2 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-all">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs font-medium">Auto 3s</span>
          </label>
        </div>
      </div>

      {loading && (
        <div className="glass-card p-12 text-center">
          <div className="inline-block w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-gray-400 mt-3 text-sm">Cargando incidencias...</p>
        </div>
      )}

      {!loading && incidents.length === 0 && (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium mb-1">No hay incidencias registradas</p>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Las incidencias apareceran aqui cuando el agente de voz procese conversaciones.
            Haz una webcall de prueba en HappyRobot para empezar.
          </p>
        </div>
      )}

      {incidents.length > 0 && (
        <div className="space-y-3">
          {incidents.map((incident, index) => {
            const status = statusConfig[incident.status] || statusConfig.error;
            const isExpanded = expandedId === incident.id;

            return (
              <div
                key={incident.id}
                className="glass-card overflow-hidden animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Header row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : incident.id)}
                  className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors text-left"
                >
                  <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-0.5 rounded-md w-20 text-center shrink-0">
                    {incident.id.slice(0, 8)}
                  </span>

                  <span className={`badge ${status.bg} ${status.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot} ${incident.status === 'in_progress' ? 'pulse-dot' : ''}`} />
                    {status.label}
                  </span>

                  <span className="text-sm font-semibold text-gray-800">{incident.incidentType}</span>

                  <div className="flex items-center gap-4 ml-auto">
                    {/* Progress */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-28 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full progress-bar ${getProgressColor(incident.completionPercentage)}`}
                          style={{ width: `${incident.completionPercentage}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold w-10 text-right ${
                        incident.completionPercentage >= 90 ? 'text-emerald-600' :
                        incident.completionPercentage >= 60 ? 'text-blue-600' : 'text-amber-600'
                      }`}>
                        {incident.completionPercentage}%
                      </span>
                    </div>

                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
                      {incident.fields.length} campos
                    </span>

                    <span className="text-xs text-gray-400">
                      {new Date(incident.updatedAt).toLocaleTimeString('es-ES')}
                    </span>

                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-5 bg-gray-50/30 animate-fade-in">
                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                      <MetaItem label="ID completo" value={incident.id} mono />
                      <MetaItem label="Form ID" value={incident.formId} mono />
                      <MetaItem label="Vigilante" value={incident.guardId} />
                      <MetaItem label="Centro" value={incident.centerId} />
                      <MetaItem label="Session HR" value={incident.happyRobotSessionId || '—'} mono />
                      <MetaItem label="Creado" value={new Date(incident.createdAt).toLocaleString('es-ES')} />
                      <MetaItem label="Actualizado" value={new Date(incident.updatedAt).toLocaleString('es-ES')} />
                      <MetaItem label="Familia" value={incident.incidentFamily} />
                    </div>

                    {/* Error */}
                    {incident.errorMessage && (
                      <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm mb-5">
                        {incident.errorMessage}
                      </div>
                    )}

                    {/* Missing mandatory */}
                    {incident.missingMandatoryFields.length > 0 && (
                      <div className="bg-amber-50 border border-amber-100 px-4 py-3 rounded-xl text-sm mb-5">
                        <span className="font-semibold text-amber-700">Campos obligatorios pendientes ({incident.missingMandatoryFields.length}):</span>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {incident.missingMandatoryFields.map((uid, i) => (
                            <span key={i} className="text-[11px] font-mono text-amber-600 bg-amber-100 px-2 py-0.5 rounded-md">
                              {uid.length > 20 ? uid.slice(0, 8) + '...' + uid.slice(-8) : uid}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fields table */}
                    {incident.fields.length > 0 ? (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">
                          Campos extraidos
                          <span className="ml-2 text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {incident.fields.length}
                          </span>
                        </h3>
                        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th style={{ width: '45%' }}>UID</th>
                                <th>Valor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {incident.fields.map((field, i) => {
                                const isFork = field.uid.includes('-') && field.uid.length > 40;
                                return (
                                  <tr key={i}>
                                    <td className="font-mono text-xs text-gray-500">
                                      {isFork && (
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mr-2 mb-px" title="Campo de bifurcacion" />
                                      )}
                                      <span className="break-all">{field.uid}</span>
                                    </td>
                                    <td className="text-sm">
                                      {field.value ? (
                                        <span className="text-gray-800">{field.value}</span>
                                      ) : (
                                        <span className="text-gray-300 italic text-xs">vacio</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Sin campos registrados aun</p>
                    )}

                    {/* Raw JSON */}
                    <details className="mt-5">
                      <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 font-medium flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        Ver JSON raw
                      </summary>
                      <pre className="mt-3 bg-gray-900 text-gray-300 text-xs p-4 rounded-xl overflow-x-auto max-h-64 overflow-y-auto leading-relaxed">
                        {JSON.stringify(incident, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MetaItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-white rounded-lg px-3 py-2.5 border border-gray-100">
      <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block mb-0.5">{label}</span>
      <span className={`text-sm text-gray-700 ${mono ? 'font-mono text-xs break-all' : ''}`}>{value}</span>
    </div>
  );
}
