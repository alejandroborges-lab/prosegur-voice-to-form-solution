'use client';

import { useEffect, useState } from 'react';
import { IncidentStats } from '@/types/incident';

interface DashboardData {
  stats: IncidentStats;
  total: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch('/api/incidents')
      .then((res) => res.json())
      .then(setData)
      .catch(() => null);
  }, []);

  return (
    <div className="animate-fade-in space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Voice to Form</h1>
          <p className="text-gray-500 mt-1">
            Vigilantes reportan incidencias por voz — el agente rellena el formulario automáticamente
          </p>
        </div>
        <a
          href="/test"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-gray-900 transition-all shadow-sm"
          style={{ backgroundColor: '#FFD203' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          Recibir llamada
        </a>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total incidencias"
          value={data?.stats.total ?? 0}
          variant="blue"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />}
        />
        <StatCard
          label="En progreso"
          value={data?.stats.inProgress ?? 0}
          variant="amber"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
        />
        <StatCard
          label="Completadas"
          value={data?.stats.completed ?? 0}
          variant="emerald"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
        />
        <StatCard
          label="Enviadas"
          value={data?.stats.submitted ?? 0}
          variant="violet"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />}
        />
      </div>

      {/* Two column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* How it works */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900">Cómo funciona</h2>
          </div>
          <div className="space-y-4">
            <Step
              number="1"
              title="Vigilante llama por teléfono"
              description="El agente de voz (HappyRobot + GPT-4.1) responde y carga la definición del formulario desde la API de Prosegur."
            />
            <Step
              number="2"
              title="Agente escucha y extrae"
              description="El vigilante narra la incidencia. El agente extrae los datos en tiempo real y rellena el formulario campo a campo."
            />
            <Step
              number="3"
              title="Formulario enviado"
              description="Al finalizar la llamada, el parte queda registrado con todos los campos obligatorios cubiertos y las bifurcaciones resueltas."
            />
          </div>
        </div>

        {/* Quick actions */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900">Accesos directos</h2>
          </div>
          <div className="space-y-3">
            <ActionCard
              href="/test"
              title="Recibir llamada de prueba"
              description="Introduce tu número y el agente te llamará para registrar una incidencia"
              iconColor="bg-yellow-50 text-yellow-600"
              icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />}
            />
            <ActionCard
              href="/incidents"
              title="Ver incidencias registradas"
              description="Lista de partes completados por el agente con sus campos y porcentaje de completitud"
              iconColor="bg-blue-50 text-blue-600"
              icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />}
            />
            <ActionCard
              href="/forms"
              title="Explorar formularios"
              description="Consulta la estructura de cualquier formulario Prosegur por su ID y visualiza sus campos"
              iconColor="bg-emerald-50 text-emerald-600"
              icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />}
            />
          </div>
        </div>
      </div>

    </div>
  );
}

function StatCard({ label, value, variant, icon }: {
  label: string;
  value: number;
  variant: string;
  icon: React.ReactNode;
}) {
  const colors: Record<string, { icon: string; value: string }> = {
    blue:    { icon: 'bg-blue-50 text-blue-600',     value: 'text-blue-600' },
    amber:   { icon: 'bg-amber-50 text-amber-600',   value: 'text-amber-600' },
    emerald: { icon: 'bg-emerald-50 text-emerald-600', value: 'text-emerald-600' },
    violet:  { icon: 'bg-violet-50 text-violet-600', value: 'text-violet-600' },
  };
  const c = colors[variant] || colors.blue;

  return (
    <div className={`stat-card stat-${variant} card-hover p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={`w-9 h-9 rounded-xl ${c.icon} flex items-center justify-center`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">{icon}</svg>
        </div>
      </div>
      <div className={`text-4xl font-bold tracking-tight ${c.value}`}>{value}</div>
    </div>
  );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-gray-900 shrink-0 mt-0.5" style={{ backgroundColor: '#FFD203' }}>
        {number}
      </div>
      <div>
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{description}</div>
      </div>
    </div>
  );
}

function ActionCard({ href, title, description, icon, iconColor }: {
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
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">{icon}</svg>
      </div>
      <div>
        <div className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">{title}</div>
        <div className="text-xs text-gray-400 mt-0.5">{description}</div>
      </div>
    </a>
  );
}
