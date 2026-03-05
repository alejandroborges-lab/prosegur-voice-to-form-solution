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
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Panel de control del sistema Voice-to-Form</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl mb-6 text-sm">
          Error: {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <StatCard
          label="Total Incidencias"
          value={data?.stats.total ?? 0}
          variant="blue"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <StatCard
          label="En Progreso"
          value={data?.stats.inProgress ?? 0}
          variant="amber"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Completadas"
          value={data?.stats.completed ?? 0}
          variant="emerald"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Enviadas"
          value={data?.stats.submitted ?? 0}
          variant="violet"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
          }
        />
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forms Available */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Formularios Disponibles</h2>
          </div>
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

        {/* Quick Actions */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Acciones Rapidas</h2>
          </div>
          <div className="space-y-3">
            <ActionCard
              href="/test"
              title="Probar Agente de Voz"
              description="Simula una conversacion de voz con el agente usando narraciones de ejemplo"
              iconColor="bg-emerald-50 text-emerald-600"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              }
            />
            <ActionCard
              href="/forms"
              title="Ver Formularios"
              description="Explora la estructura de los formularios y sus bifurcaciones"
              iconColor="bg-blue-50 text-blue-600"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
            />
            <ActionCard
              href="/incidents"
              title="Ver Incidencias"
              description="Lista de incidencias procesadas por el agente"
              iconColor="bg-amber-50 text-amber-600"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  variant,
  icon,
}: {
  label: string;
  value: number;
  variant: string;
  icon: React.ReactNode;
}) {
  const colors: Record<string, { icon: string; value: string }> = {
    blue: { icon: 'bg-blue-50 text-blue-600', value: 'text-blue-600' },
    amber: { icon: 'bg-amber-50 text-amber-600', value: 'text-amber-600' },
    emerald: { icon: 'bg-emerald-50 text-emerald-600', value: 'text-emerald-600' },
    violet: { icon: 'bg-violet-50 text-violet-600', value: 'text-violet-600' },
  };

  const c = colors[variant] || colors.blue;

  return (
    <div className={`stat-card stat-${variant} card-hover p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={`w-9 h-9 rounded-xl ${c.icon} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <div className={`text-4xl font-bold tracking-tight ${c.value}`}>{value}</div>
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
    <a
      href={`/forms`}
      className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all group"
    >
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">{name}</div>
        <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{description}</div>
      </div>
      <span className="text-[11px] font-mono text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 ml-3 shrink-0">
        {id}
      </span>
    </a>
  );
}

function ActionCard({
  href,
  title,
  description,
  icon,
  iconColor,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconColor: string;
}) {
  return (
    <a
      href={href}
      className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all group"
    >
      <div className={`w-8 h-8 rounded-lg ${iconColor} flex items-center justify-center shrink-0 mt-0.5`}>
        {icon}
      </div>
      <div>
        <div className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">{title}</div>
        <div className="text-xs text-gray-400 mt-0.5">{description}</div>
      </div>
    </a>
  );
}
