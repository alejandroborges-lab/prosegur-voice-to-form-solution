'use client';

import { useEffect, useState, useCallback } from 'react';
import { Incident, CallAnalytics } from '@/types/incident';

interface AggregatedAnalytics {
  totalWithAnalytics: number;
  severity: Record<string, number>;
  categories: Record<string, number>;
  sentiment: Record<string, number>;
  policeInvolved: number;
  injuriesReported: number;
  totalEstimatedValue: number;
  avgEstimatedValue: number;
  avgReaskCount: number;
  totalReasks: number;
  recentIncidents: Array<{ id: string; summary: string; severity: string; category: string; value: number; date: string }>;
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; bar: string }> = {
  low: { label: 'Baja', color: 'text-emerald-700', bg: 'bg-emerald-50', bar: 'bg-emerald-500' },
  medium: { label: 'Media', color: 'text-amber-700', bg: 'bg-amber-50', bar: 'bg-amber-500' },
  high: { label: 'Alta', color: 'text-orange-700', bg: 'bg-orange-50', bar: 'bg-orange-500' },
  critical: { label: 'Critica', color: 'text-red-700', bg: 'bg-red-50', bar: 'bg-red-500' },
};

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string; bar: string }> = {
  theft: { label: 'Hurto/Robo', color: 'text-blue-700', bg: 'bg-blue-50', bar: 'bg-blue-500' },
  assault: { label: 'Agresion', color: 'text-red-700', bg: 'bg-red-50', bar: 'bg-red-500' },
  vandalism: { label: 'Vandalismo', color: 'text-purple-700', bg: 'bg-purple-50', bar: 'bg-purple-500' },
  intrusion: { label: 'Intrusion', color: 'text-orange-700', bg: 'bg-orange-50', bar: 'bg-orange-500' },
  other: { label: 'Otros', color: 'text-gray-700', bg: 'bg-gray-50', bar: 'bg-gray-500' },
};

const SENTIMENT_CONFIG: Record<string, { label: string; color: string; bg: string; bar: string }> = {
  calm: { label: 'Tranquilo', color: 'text-emerald-700', bg: 'bg-emerald-50', bar: 'bg-emerald-500' },
  stressed: { label: 'Estresado', color: 'text-amber-700', bg: 'bg-amber-50', bar: 'bg-amber-500' },
  urgent: { label: 'Urgente', color: 'text-red-700', bg: 'bg-red-50', bar: 'bg-red-500' },
};

function aggregate(incidents: Incident[]): AggregatedAnalytics {
  const withAnalytics = incidents.filter((i) => i.analytics);
  const analytics = withAnalytics.map((i) => i.analytics!);

  const severity: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  const categories: Record<string, number> = { theft: 0, assault: 0, vandalism: 0, intrusion: 0, other: 0 };
  const sentiment: Record<string, number> = { calm: 0, stressed: 0, urgent: 0 };
  let policeInvolved = 0;
  let injuriesReported = 0;
  let totalValue = 0;
  let totalReasks = 0;

  for (const a of analytics) {
    severity[a.severity] = (severity[a.severity] || 0) + 1;
    categories[a.incident_category] = (categories[a.incident_category] || 0) + 1;
    sentiment[a.guard_sentiment] = (sentiment[a.guard_sentiment] || 0) + 1;
    if (a.police_involved) policeInvolved++;
    if (a.injuries_reported) injuriesReported++;
    totalValue += a.estimated_value;
    totalReasks += a.reask_count;
  }

  const recent = withAnalytics.slice(0, 5).map((i) => ({
    id: i.id,
    summary: i.analytics!.summary,
    severity: i.analytics!.severity,
    category: i.analytics!.incident_category,
    value: i.analytics!.estimated_value,
    date: i.updatedAt,
  }));

  return {
    totalWithAnalytics: withAnalytics.length,
    severity,
    categories,
    sentiment,
    policeInvolved,
    injuriesReported,
    totalEstimatedValue: totalValue,
    avgEstimatedValue: analytics.length > 0 ? Math.round(totalValue / analytics.length) : 0,
    avgReaskCount: analytics.length > 0 ? Math.round((totalReasks / analytics.length) * 10) / 10 : 0,
    totalReasks,
    recentIncidents: recent,
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AggregatedAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    fetch('/api/incidents')
      .then((res) => res.json())
      .then((res) => {
        setData(aggregate(res.incidents || []));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-20">
        <div className="inline-block w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || data.totalWithAnalytics === 0) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1">Metricas extraidas automaticamente de las llamadas</p>
        </div>
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium mb-1">Sin datos de analytics</p>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Los analytics aparecerran aqui cuando el nodo &quot;Extract Call Analytics&quot; de HappyRobot envie metricas al backend.
          </p>
        </div>
      </div>
    );
  }

  const n = data.totalWithAnalytics;
  const policePercent = Math.round((data.policeInvolved / n) * 100);
  const injuriesPercent = Math.round((data.injuriesReported / n) * 100);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1">Metricas extraidas automaticamente de las llamadas</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />
          {n} llamada{n !== 1 ? 's' : ''} analizadas
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Valor total sustraido"
          value={`${data.totalEstimatedValue.toLocaleString('es-ES')} EUR`}
          variant="blue"
        />
        <KpiCard
          label="Valor medio"
          value={`${data.avgEstimatedValue.toLocaleString('es-ES')} EUR`}
          variant="violet"
        />
        <KpiCard
          label="Policia involucrada"
          value={`${policePercent}%`}
          subtitle={`${data.policeInvolved} de ${n}`}
          variant="amber"
        />
        <KpiCard
          label="Con heridos"
          value={`${injuriesPercent}%`}
          subtitle={`${data.injuriesReported} de ${n}`}
          variant="red"
        />
        <KpiCard
          label="Re-preguntas (media)"
          value={`${data.avgReaskCount}`}
          subtitle="Eficiencia del agente"
          variant="emerald"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Distribution */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Severidad</h2>
          <div className="space-y-3">
            {Object.entries(SEVERITY_CONFIG).map(([key, config]) => {
              const count = data.severity[key] || 0;
              const pct = n > 0 ? Math.round((count / n) * 100) : 0;
              return (
                <BarRow key={key} label={config.label} count={count} pct={pct} barColor={config.bar} badgeBg={config.bg} badgeText={config.color} />
              );
            })}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Categorias</h2>
          <div className="space-y-3">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
              const count = data.categories[key] || 0;
              const pct = n > 0 ? Math.round((count / n) * 100) : 0;
              return (
                <BarRow key={key} label={config.label} count={count} pct={pct} barColor={config.bar} badgeBg={config.bg} badgeText={config.color} />
              );
            })}
          </div>
        </div>

        {/* Guard Sentiment */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Sentimiento del vigilante</h2>
          <div className="space-y-3">
            {Object.entries(SENTIMENT_CONFIG).map(([key, config]) => {
              const count = data.sentiment[key] || 0;
              const pct = n > 0 ? Math.round((count / n) * 100) : 0;
              return (
                <BarRow key={key} label={config.label} count={count} pct={pct} barColor={config.bar} badgeBg={config.bg} badgeText={config.color} />
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Incidents */}
      {data.recentIncidents.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Ultimas incidencias analizadas</h2>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '8%' }}>ID</th>
                  <th style={{ width: '40%' }}>Resumen</th>
                  <th>Severidad</th>
                  <th>Categoria</th>
                  <th style={{ textAlign: 'right' }}>Valor</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {data.recentIncidents.map((r) => {
                  const sev = SEVERITY_CONFIG[r.severity] || SEVERITY_CONFIG.low;
                  const cat = CATEGORY_CONFIG[r.category] || CATEGORY_CONFIG.other;
                  return (
                    <tr key={r.id}>
                      <td className="font-mono text-xs text-gray-500">{r.id.slice(0, 8)}</td>
                      <td className="text-sm text-gray-800">{r.summary}</td>
                      <td>
                        <span className={`badge ${sev.bg} ${sev.color}`}>{sev.label}</span>
                      </td>
                      <td>
                        <span className={`badge ${cat.bg} ${cat.color}`}>{cat.label}</span>
                      </td>
                      <td className="text-sm text-gray-700 text-right font-mono">
                        {r.value > 0 ? `${r.value.toLocaleString('es-ES')} EUR` : '—'}
                      </td>
                      <td className="text-xs text-gray-400">
                        {new Date(r.date).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, subtitle, variant }: {
  label: string;
  value: string;
  subtitle?: string;
  variant: string;
}) {
  const colors: Record<string, string> = {
    blue: 'text-blue-600',
    violet: 'text-violet-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
    emerald: 'text-emerald-600',
  };

  return (
    <div className={`stat-card stat-${variant} card-hover p-5`}>
      <span className="text-xs font-medium text-gray-500 block mb-2">{label}</span>
      <div className={`text-2xl font-bold tracking-tight ${colors[variant] || 'text-gray-900'}`}>{value}</div>
      {subtitle && <span className="text-[11px] text-gray-400 mt-1 block">{subtitle}</span>}
    </div>
  );
}

function BarRow({ label, count, pct, barColor, badgeBg, badgeText }: {
  label: string;
  count: number;
  pct: number;
  barColor: string;
  badgeBg: string;
  badgeText: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs font-medium w-20 shrink-0 ${badgeText}`}>{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full progress-bar ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`badge text-[11px] ${badgeBg} ${badgeText} min-w-[48px] justify-center`}>
        {count}
      </span>
    </div>
  );
}
