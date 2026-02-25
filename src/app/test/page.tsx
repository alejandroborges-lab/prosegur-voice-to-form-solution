'use client';

import { useState } from 'react';

interface MappingResult {
  fields_filled: number;
  total_active_fields: number;
  completion_percentage: number;
  missing_mandatory: { uid: string; question: string }[];
  warnings: { uid: string; message: string }[];
}

interface TestResult {
  success?: boolean;
  incident_id?: string;
  mapping_result?: MappingResult;
  prosegur_submission?: { uid: string; value: string }[];
  error?: string;
}

const FORMS = [
  { id: 'hurto-generico', name: 'Hurto Generico' },
  { id: 'hurto-recuperacion', name: 'Hurto con Recuperacion' },
  { id: 'hurto-centro-comercial', name: 'Hurto en Centro Comercial' },
];

const SAMPLE_NARRATIONS = [
  {
    label: 'Hurto simple con detencion',
    text: 'Ha entrado una persona de unos 30 años en la zona de acceso publico. Se ha llevado varios productos de limpieza, unos 5 articulos. Los escondia en una mochila. Lo hemos detectado por las camaras de CCTV y lo hemos detenido junto con la policia nacional que llego sobre las 16:30. El importe de lo sustraido es de unos 45 euros. No ha habido consecuencias sobre personas. Se ha puesto denuncia en las dependencias policiales. Ha ocurrido hoy a las 15:45.',
  },
  {
    label: 'Hurto con huida',
    text: 'Sobre las 11 de la manana un individuo se ha llevado un jamon del almacen. Lo detecto el dependiente, que es personal del cliente. El sospechoso ha huido corriendo hacia el aparcamiento. Hemos llamado a la policia local pero no han podido localizarlo. El jamon valia unos 120 euros. No se ha puesto denuncia. No ha habido violencia ni consecuencias sobre personas.',
  },
  {
    label: 'Hurto con consecuencias',
    text: 'A las 14:00 en la zona de oficinas, una persona ha intentado robar bienes del cliente, concretamente herramientas. Cuando le hemos pillado, ha agredido a un vigilante de Prosegur. Ha habido consecuencias sobre personas, con lesiones. Hemos realizado primeros auxilios de tipo RCP. Hemos avisado a la ambulancia que ha llegado a las 14:20 y tambien a la policia nacional. Lo hemos detenido. El importe era de unos 200 euros. Se ha interpuesto denuncia por el personal del cliente y por Prosegur.',
  },
];

export default function TestPage() {
  const [selectedForm, setSelectedForm] = useState(FORMS[0].id);
  const [narration, setNarration] = useState('');
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Simulate an extracted_data payload from the narration
      // In real usage, HappyRobot's AI Extract would do this
      const res = await fetch('/api/webhooks/happyrobot/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_id: selectedForm,
          guard_id: 'TEST_GUARD_001',
          center_id: 'TEST_CENTER_001',
          incident_family: 'Hurto',
          incident_type: FORMS.find((f) => f.id === selectedForm)?.name || selectedForm,
          // For testing, we pass the narration as raw text fields
          // In production, HappyRobot's AI Extract would parse this into structured data
          extracted_data: parseNarrationToFields(narration),
          transcript: narration,
        }),
      });

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Test de Conversacion</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Formulario</label>
            <select
              value={selectedForm}
              onChange={(e) => setSelectedForm(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {FORMS.map((form) => (
                <option key={form.id} value={form.id}>
                  {form.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Narracion del vigilante</label>
            <textarea
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              rows={8}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Escribe la narracion del vigilante aqui..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Ejemplos rapidos</label>
            <div className="space-y-2">
              {SAMPLE_NARRATIONS.map((sample) => (
                <button
                  key={sample.label}
                  onClick={() => setNarration(sample.text)}
                  className="block w-full text-left px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={runTest}
            disabled={loading || !narration.trim()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Procesando...' : 'Enviar y Procesar'}
          </button>
        </div>

        {/* Result */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Resultado</h2>
          {result ? (
            <div className="space-y-4">
              {result.mapping_result && (
                <div className="bg-white rounded-lg border p-4">
                  <h3 className="font-medium mb-2">Resumen del Mapeo</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Campos rellenados: <strong>{result.mapping_result.fields_filled}</strong></div>
                    <div>Total activos: <strong>{result.mapping_result.total_active_fields}</strong></div>
                    <div>Completado: <strong>{result.mapping_result.completion_percentage}%</strong></div>
                  </div>
                  {result.mapping_result.missing_mandatory?.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-red-600">Campos obligatorios faltantes:</h4>
                      <ul className="text-sm text-red-500 mt-1 space-y-1">
                        {result.mapping_result.missing_mandatory.map((m) => (
                          <li key={m.uid}>- {m.question}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {result.prosegur_submission && (
                <div className="bg-white rounded-lg border p-4">
                  <h3 className="font-medium mb-2">Datos para Prosegur</h3>
                  <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-auto max-h-80">
                    {JSON.stringify(result.prosegur_submission, null, 2)}
                  </pre>
                </div>
              )}

              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-medium mb-2">Respuesta Completa</h3>
                <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-auto max-h-80">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border p-8 text-center text-gray-400">
              Selecciona una narracion y pulsa enviar para ver el resultado
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Simple keyword-based parser to simulate what HappyRobot's AI Extract would do.
 * In production, the AI model handles this with the prompt context.
 */
function parseNarrationToFields(text: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const lower = text.toLowerCase();

  // Time extraction
  const timeMatch = lower.match(/a las (\d{1,2}[:.]\d{2})/);
  const hourMatch = lower.match(/a las (\d{1,2})\b/);
  if (timeMatch) {
    const today = new Date().toISOString().split('T')[0];
    fields['cuando_ha_ocurrido'] = `${today}T${timeMatch[1].replace('.', ':')}:00`;
  } else if (hourMatch) {
    const today = new Date().toISOString().split('T')[0];
    fields['cuando_ha_ocurrido'] = `${today}T${hourMatch[1].padStart(2, '0')}:00:00`;
  }

  // Location
  if (lower.includes('aparcamiento') || lower.includes('parking')) fields['donde_ha_ocurrido'] = 'Aparcamiento';
  else if (lower.includes('almacen') || lower.includes('trastienda')) fields['donde_ha_ocurrido'] = 'Almacen';
  else if (lower.includes('aseos') || lower.includes('banos')) fields['donde_ha_ocurrido'] = 'Aseos';
  else if (lower.includes('zona de acceso') || lower.includes('acceso publico')) fields['donde_ha_ocurrido'] = 'Zona de Acceso Publico';
  else if (lower.includes('oficina')) fields['donde_ha_ocurrido'] = 'Zona de Oficinas';
  else if (lower.includes('zona restringida')) fields['donde_ha_ocurrido'] = 'Zona Restringida';

  // What was stolen
  if (lower.includes('bienes del cliente') || lower.includes('productos') || lower.includes('producto') ||
      lower.includes('herramienta') || lower.includes('jamon') || lower.includes('articulo')) {
    fields['se_ha_sustraido'] = 'Bienes del cliente (material, producto, etc.)';
  }
  if (lower.includes('dinero') || lower.includes('cartera')) {
    fields['se_ha_sustraido'] = 'Dinero / cartera / bolso';
  }

  // Amount
  const amountMatch = lower.match(/(\d+)\s*euros?/);
  if (amountMatch) {
    fields['importe_de_los_productos_intervenidos'] = amountMatch[1];
  }

  // Consequences
  if (lower.includes('no ha habido consecuencias') || lower.includes('no ha habido violencia') || lower.includes('sin lesiones') || lower.includes('no hubo')) {
    fields['ha_habido_consecuencias_sobre_personas_agresion__alteracion_del_estado_de_la_salud'] = 'No';
  } else if (lower.includes('consecuencias sobre personas') || lower.includes('agredido') || lower.includes('agresion')) {
    fields['ha_habido_consecuencias_sobre_personas_agresion__alteracion_del_estado_de_la_salud'] = 'Si';
  }

  // Detection
  if (lower.includes('camara') || lower.includes('cctv') || lower.includes('monitor')) {
    fields['ha_sido_detectado_mediante'] = 'CCTV';
  }
  if (lower.includes('dependiente') || lower.includes('personal del cliente') || lower.includes('cajero')) {
    fields['ha_sido_detectado_por'] = 'Personal del Cliente';
  }

  // Concealment
  if (lower.includes('mochila') || lower.includes('bolso') || lower.includes('bolsa')) {
    fields['medio_de_ocultacion'] = 'Si';
  }

  // Assistance
  if (lower.includes('policia') || lower.includes('agentes') || lower.includes('ambulancia')) {
    fields['se_avisaron_asistencias'] = 'Si';
  }

  // Result
  if (lower.includes('detenido') || lower.includes('detencion') || lower.includes('detuvimos')) {
    fields['resultado'] = 'A disposicion de FFCCS';
  } else if (lower.includes('huido') || lower.includes('huyo') || lower.includes('escapo')) {
    fields['resultado'] = 'Huida sin recuperacion de efectos';
  }

  // Complaint
  if (lower.includes('denuncia') && !lower.includes('no se')) {
    fields['se_efectua_denuncia'] = 'Si';
  } else if (lower.includes('no se ha puesto denuncia') || lower.includes('no se denuncio')) {
    fields['se_efectua_denuncia'] = 'No';
  }

  return fields;
}
