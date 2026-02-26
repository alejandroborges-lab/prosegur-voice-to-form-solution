import { NextRequest, NextResponse } from 'next/server';
import { loadFormDefinition } from '@/lib/formLoader';
import { processForm } from '@/services/formProcessor';
import { mapExtractedData } from '@/services/formMapper';
import { store } from '@/lib/store';

/**
 * POST /api/forms/update
 * Receives partial field updates in real-time during the voice conversation.
 * The voice agent calls "actualizar_formulario" which triggers this endpoint.
 * Fields are merged with existing data (not replaced).
 */
export async function POST(request: NextRequest) {
  const body = await request.json() as {
    session_id?: string;
    incident_id?: string;
    form_id: string;
    guard_id?: string;
    center_id?: string;
    incident_family?: string;
    incident_type?: string;
    campos: Record<string, string | string[] | null>;
  };

  if (!body.form_id || !body.campos) {
    return NextResponse.json(
      { error: 'form_id and campos are required' },
      { status: 400 }
    );
  }

  // Load and process form
  const rawForm = loadFormDefinition(body.form_id);
  if (!rawForm) {
    return NextResponse.json(
      { error: `Form not found: ${body.form_id}` },
      { status: 404 }
    );
  }

  const processed = processForm(rawForm);

  // Map the partial extracted data
  const mappingResult = mapExtractedData(processed, body.campos);

  // Find or create incident
  let incident = body.incident_id
    ? store.getIncident(body.incident_id)
    : body.session_id
      ? store.findBySessionId(body.session_id)
      : undefined;

  if (!incident) {
    incident = store.createIncident({
      formId: body.form_id,
      guardId: body.guard_id || 'unknown',
      centerId: body.center_id || 'unknown',
      incidentFamily: body.incident_family || 'Hurto',
      incidentType: body.incident_type || body.form_id,
      happyRobotSessionId: body.session_id,
    });
  }

  // Merge partial fields (don't replace all)
  store.mergeIncidentFields(
    incident.id,
    mappingResult.fields,
    mappingResult.completionPercentage
  );

  return NextResponse.json({
    success: true,
    incident_id: incident.id,
    fields_updated: mappingResult.filledCount,
    total_fields_so_far: incident.fields.length,
    completion_percentage: mappingResult.completionPercentage,
    warnings: mappingResult.warnings,
  });
}
