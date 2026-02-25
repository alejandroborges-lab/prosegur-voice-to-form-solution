'use client';

import { useEffect, useState } from 'react';
import { Incident } from '@/types/incident';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/incidents')
      .then((res) => res.json())
      .then((data) => {
        setIncidents(data.incidents);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const statusColors: Record<string, string> = {
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    submitted: 'bg-blue-100 text-blue-800',
    error: 'bg-red-100 text-red-800',
  };

  const statusLabels: Record<string, string> = {
    in_progress: 'En Progreso',
    completed: 'Completada',
    submitted: 'Enviada',
    error: 'Error',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Incidencias</h1>

      {loading && <p className="text-gray-500">Cargando...</p>}

      {!loading && incidents.length === 0 && (
        <div className="bg-white rounded-lg border p-8 text-center">
          <p className="text-gray-500 mb-2">No hay incidencias registradas</p>
          <p className="text-sm text-gray-400">
            Las incidencias apareceran aqui cuando el agente procese conversaciones
          </p>
          <a
            href="/test"
            className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Probar una conversacion
          </a>
        </div>
      )}

      {incidents.length > 0 && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">ID</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Tipo</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Estado</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Completado</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Campos</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {incidents.map((incident) => (
                <tr key={incident.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">
                    {incident.id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3 text-sm">{incident.incidentType}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColors[incident.status] || ''}`}
                    >
                      {statusLabels[incident.status] || incident.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${incident.completionPercentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{incident.completionPercentage}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {incident.fields.length} campos
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(incident.createdAt).toLocaleString('es-ES')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
