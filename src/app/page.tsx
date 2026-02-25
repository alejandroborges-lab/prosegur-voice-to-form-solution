'use client';

import { useEffect, useState } from 'react';
import { IncidentStats } from '@/types/incident';

interface DashboardData {
  stats: IncidentStats;
  total: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/incidents')
      .then((res) => res.json())
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Incidencias"
          value={data?.stats.total ?? 0}
          color="blue"
        />
        <StatCard
          label="En Progreso"
          value={data?.stats.inProgress ?? 0}
          color="yellow"
        />
        <StatCard
          label="Completadas"
          value={data?.stats.completed ?? 0}
          color="green"
        />
        <StatCard
          label="Enviadas"
          value={data?.stats.submitted ?? 0}
          color="indigo"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Formularios Disponibles</h2>
          <div className="space-y-3">
            <FormCard
              name="Hurto Generico"
              id="hurto-generico"
              description="Formulario completo con bifurcaciones de consecuencias, denuncia y modus operandi"
            />
            <FormCard
              name="Hurto con Recuperacion"
              id="hurto-recuperacion"
              description="Formulario simplificado para hurtos donde se recupera el producto"
            />
            <FormCard
              name="Hurto en Centro Comercial"
              id="hurto-centro-comercial"
              description="Formulario extendido con datos de planta, zona y local"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Acciones Rapidas</h2>
          <div className="space-y-3">
            <a
              href="/test"
              className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium">Probar Conversacion</div>
              <div className="text-sm text-gray-500">
                Simula una conversacion con el agente usando datos de ejemplo
              </div>
            </a>
            <a
              href="/forms"
              className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium">Ver Formularios</div>
              <div className="text-sm text-gray-500">
                Explora la estructura de los formularios y sus bifurcaciones
              </div>
            </a>
            <a
              href="/incidents"
              className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium">Ver Incidencias</div>
              <div className="text-sm text-gray-500">
                Lista de incidencias procesadas por el agente
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color] || ''}`}>
      <div className="text-sm font-medium">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}

function FormCard({
  name,
  id,
  description,
}: {
  name: string;
  id: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-sm text-gray-500">{description}</div>
      </div>
      <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">
        {id}
      </span>
    </div>
  );
}
