import { NextRequest, NextResponse } from 'next/server';
import { loadFormDefinition } from '@/lib/formLoader';
import { processForm } from '@/services/formProcessor';
import { mapExtractedData } from '@/services/formMapper';
import { store } from '@/lib/store';

/**
 * POST /api/forms/update
 * Receives partial field updates in real-time during the voice conversation.
 * The voice agent calls "actualizar_formulario" / "finalizar_formulario" which triggers this endpoint.
 *
 * Accepts multiple body formats for robustness:
 * 1. { form_id, campos: {...} }                    — standard (object with uid keys)
 * 2. { form_id, campos: '{"uid":"val"}' }          — campos as JSON string
 * 3. { form_id, campos: [{uid,value},...] }        — array format (from AI Extract)
 * 4. { campos: {...} }                             — no form_id (defaults to hurto-generico)
 * 5. { "uid1": "val1", "uid2": "val2" }            — flat UIDs at root level
 * 6. Entire body is a JSON string                  — double-encoded
 * 7. { response: { campos: [...] }, prompt, ... }  — full HappyRobot Extract output
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  // Log incoming request for debugging
  console.log('[forms/update] Raw body:', JSON.stringify(body).slice(0, 500));

  // Extract form_id (default to hurto-generico if not provided)
  const formId = (body.form_id as string) || 'hurto-generico';

  // Extract campos — try multiple strategies
  let campos: Record<string, string | string[] | null> | undefined;

  // Strategy 0: HappyRobot Extract sends full output with campos inside response
  const camposSource = body.campos ?? (body.response as Record<string, unknown> | undefined)?.campos;

  // Strategy 1: campos field exists (at root or inside response)
  if (camposSource) {
    if (typeof camposSource === 'string') {
      // campos is a JSON string — parse it
      try {
        campos = JSON.parse(camposSource);
      } catch {
        // Maybe it's double-encoded
        try {
          campos = JSON.parse(JSON.parse(`"${camposSource.replace(/"/g, '\\"')}"`));
        } catch {
          console.log('[forms/update] Failed to parse campos string:', camposSource.slice(0, 200));
        }
      }
    } else if (Array.isArray(camposSource)) {
      // campos is an array of {uid, value} objects (from AI Extract node)
      const arrayCampos: Record<string, string> = {};
      for (const item of camposSource as Array<{ uid?: string; value?: string }>) {
        if (item.uid && typeof item.value === 'string') {
          arrayCampos[item.uid] = item.value;
        }
      }
      if (Object.keys(arrayCampos).length > 0) {
        campos = arrayCampos;
        console.log('[forms/update] Parsed campos from array format:', Object.keys(arrayCampos).length);
      }
    } else if (typeof camposSource === 'object') {
      campos = camposSource as Record<string, string | string[] | null>;
    }
  }

  // Strategy 2: Look for UIDs at root level (flat format)
  if (!campos || Object.keys(campos).length === 0) {
    const uidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;
    const flatCampos: Record<string, string> = {};
    for (const [key, value] of Object.entries(body)) {
      if (uidPattern.test(key) && typeof value === 'string') {
        flatCampos[key] = value;
      }
    }
    if (Object.keys(flatCampos).length > 0) {
      campos = flatCampos;
      console.log('[forms/update] Found UIDs at root level:', Object.keys(flatCampos).length);
    }
  }

  // Strategy 3: Check if there's a nested object with _message (GPT adds this sometimes)
  if (!campos) {
    for (const value of Object.values(body)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const obj = value as Record<string, unknown>;
        const uidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-/;
        const hasUids = Object.keys(obj).some(k => uidPattern.test(k));
        if (hasUids) {
          campos = obj as Record<string, string>;
          console.log('[forms/update] Found UIDs in nested object');
          break;
        }
      }
    }
  }

  if (!campos || Object.keys(campos).length === 0) {
    console.log('[forms/update] No campos found. Body keys:', Object.keys(body));
    return NextResponse.json(
      {
        error: 'No campos found in request. Send { "form_id": "hurto-generico", "campos": { "uid": "value" } }',
        received_keys: Object.keys(body),
      },
      { status: 400 }
    );
  }

  // Load and process form
  const rawForm = loadFormDefinition(formId);
  if (!rawForm) {
    return NextResponse.json(
      { error: `Form not found: ${formId}` },
      { status: 404 }
    );
  }

  const processed = processForm(rawForm);

  // Map the partial extracted data
  const mappingResult = mapExtractedData(processed, campos);

  // Find or create incident
  const sessionId = body.session_id as string | undefined;
  const incidentId = body.incident_id as string | undefined;

  let incident = incidentId
    ? store.getIncident(incidentId)
    : sessionId
      ? store.findBySessionId(sessionId)
      : undefined;

  if (!incident) {
    incident = store.createIncident({
      formId,
      guardId: (body.guard_id as string) || 'unknown',
      centerId: (body.center_id as string) || 'unknown',
      incidentFamily: (body.incident_family as string) || 'Hurto',
      incidentType: (body.incident_type as string) || formId,
      happyRobotSessionId: sessionId,
    });
  }

  // Merge partial fields (don't replace all, don't set percentage yet)
  store.mergeIncidentFields(incident.id, mappingResult.fields);

  // Recalculate completion based on ALL accumulated fields (not just this batch)
  const updatedIncident = store.getIncident(incident.id)!;
  const allFieldsRecord: Record<string, string> = {};
  for (const f of updatedIncident.fields) {
    allFieldsRecord[f.uid] = f.value;
  }
  const totalMapping = mapExtractedData(processed, allFieldsRecord);

  // Update with correct total completion percentage
  store.mergeIncidentFields(incident.id, [], totalMapping.completionPercentage);

  console.log(`[forms/update] OK: incident=${incident.id}, fields_updated=${mappingResult.filledCount}, total=${updatedIncident.fields.length}, completion=${totalMapping.completionPercentage}%`);

  return NextResponse.json({
    success: true,
    incident_id: incident.id,
    fields_updated: mappingResult.filledCount,
    total_fields_so_far: updatedIncident.fields.length,
    completion_percentage: totalMapping.completionPercentage,
    warnings: mappingResult.warnings,
  });
}
