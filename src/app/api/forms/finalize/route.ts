import { NextRequest, NextResponse } from 'next/server';
import { loadFormDefinition } from '@/lib/formLoader';
import { processForm } from '@/services/formProcessor';
import { mapExtractedData } from '@/services/formMapper';
import { store } from '@/lib/store';

/**
 * POST /api/forms/finalize
 * Called by the voice agent's "finalizar_formulario" tool.
 * Does NOT receive field data — all fields were already sent via "actualizar_formulario".
 * This endpoint marks the incident as completed and returns the final state.
 *
 * Accepts optional: { incident_id?, form_id? }
 * If no incident_id, finds the most recent in-progress incident for the form.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};

  try {
    body = await request.json();
  } catch {
    // Body might be empty — that's OK for finalize
  }

  console.log('[forms/finalize] Body:', JSON.stringify(body).slice(0, 300));

  const incidentId = body.incident_id as string | undefined;
  const formId = (body.form_id as string) || 'hurto-generico';

  // Find incident
  let incident = incidentId
    ? store.getIncident(incidentId)
    : undefined;

  // If not found by ID, find most recent in-progress for this form
  if (!incident) {
    const incidents = store.listIncidents({ status: 'in_progress', formId });
    incident = incidents[0]; // Already sorted by newest first
  }

  if (!incident) {
    return NextResponse.json(
      { error: 'No in-progress incident found to finalize' },
      { status: 404 }
    );
  }

  // Recalculate completion based on ALL accumulated fields
  const rawForm = loadFormDefinition(incident.formId);
  if (rawForm) {
    const processed = processForm(rawForm);
    const allFieldsRecord: Record<string, string> = {};
    for (const f of incident.fields) {
      allFieldsRecord[f.uid] = f.value;
    }
    const finalMapping = mapExtractedData(processed, allFieldsRecord);

    store.updateIncidentFields(
      incident.id,
      finalMapping.fields,
      finalMapping.completionPercentage,
      finalMapping.missingMandatory.map(f => f.uid)
    );
  }

  // Mark as submitted
  store.submitIncident(incident.id);

  // Refresh
  incident = store.getIncident(incident.id)!;

  console.log(`[forms/finalize] OK: incident=${incident.id}, fields=${incident.fields.length}, status=${incident.status}`);

  return NextResponse.json({
    success: true,
    incident_id: incident.id,
    status: incident.status,
    fields_count: incident.fields.length,
    completion_percentage: incident.completionPercentage,
    missing_mandatory: incident.missingMandatoryFields,
    prosegur_submission: incident.fields,
  });
}
