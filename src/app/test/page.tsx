'use client';

import { useState } from 'react';

type CallState = 'idle' | 'loading' | 'success' | 'error';

export default function TestPage() {
  const [guardId, setGuardId] = useState('');
  const [centerId, setCenterId] = useState('');
  const [phone, setPhone] = useState('');
  const [incidentType, setIncidentType] = useState('76');
  const [incidentFamily, setIncidentFamily] = useState('CCTV');
  const [state, setState] = useState<CallState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleCall = async () => {
    if (!phone.trim()) return;
    setState('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/call/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guard_id: guardId || 'N/A',
          center_id: centerId || 'N/A',
          phone_number: phone.trim(),
          incident_type: incidentType.trim(),
          incident_family: incidentFamily.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setErrorMsg(err.error || `Error ${res.status}`);
        setState('error');
        return;
      }

      setState('success');
    } catch {
      setErrorMsg('Error de conexión con el servidor');
      setState('error');
    }
  };

  const reset = () => {
    setState('idle');
    setErrorMsg('');
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center animate-fade-in">

      {/* Branding */}
      <div className="flex items-center gap-4 mb-10">
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#E30613] text-white font-bold text-lg tracking-tight shadow-sm">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
          </svg>
          Prosegur
        </div>
        <span className="text-gray-300 text-xl font-light">×</span>
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-gray-900 text-white font-bold text-lg tracking-tight shadow-sm">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          HappyRobot
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-md">
        {state === 'success' ? (
          /* Success state */
          <div className="glass-card p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">¡Llamada iniciada!</h2>
              <p className="text-gray-500 text-sm mt-1">
                Recibirás la llamada en <span className="font-semibold text-gray-700">{phone}</span> en breve.
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-left text-sm space-y-1.5">
              <Row label="Formulario" value={incidentType} />
              <Row label="Tipo" value={incidentFamily} />
              <Row label="Vigilante" value={guardId || 'N/A'} />
              <Row label="Centro" value={centerId || 'N/A'} />
            </div>
            <button
              onClick={reset}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Nueva llamada
            </button>
          </div>
        ) : (
          /* Form */
          <div className="glass-card p-8 space-y-5">
            <div className="text-center mb-2">
              <h1 className="text-xl font-bold text-gray-900">Simulador de llamada</h1>
              <p className="text-gray-400 text-sm mt-1">Introduce los datos para recibir la llamada del agente</p>
            </div>

            {/* Phone — most prominent */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Número de teléfono <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+34 600 000 000"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-base text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent shadow-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  ID Formulario
                </label>
                <input
                  type="text"
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                  placeholder="76"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Tipo incidencia
                </label>
                <input
                  type="text"
                  value={incidentFamily}
                  onChange={(e) => setIncidentFamily(e.target.value)}
                  placeholder="CCTV"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent shadow-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  ID Vigilante
                </label>
                <input
                  type="text"
                  value={guardId}
                  onChange={(e) => setGuardId(e.target.value)}
                  placeholder="VIG-001"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  ID Centro
                </label>
                <input
                  type="text"
                  value={centerId}
                  onChange={(e) => setCenterId(e.target.value)}
                  placeholder="CEN-001"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent shadow-sm"
                />
              </div>
            </div>

            {state === 'error' && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                {errorMsg}
              </div>
            )}

            <button
              onClick={handleCall}
              disabled={state === 'loading' || !phone.trim()}
              className="w-full py-3.5 rounded-xl bg-[#E30613] hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold text-base transition-all shadow-sm shadow-red-600/20 flex items-center justify-center gap-2.5"
            >
              {state === 'loading' ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Iniciando llamada...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Recibir llamada
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-gray-700">{value}</span>
    </div>
  );
}
