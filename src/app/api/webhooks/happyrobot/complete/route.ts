import { NextRequest, NextResponse } from 'next/server';
import { loadFormDefinition } from '@/lib/formLoader';
import { processForm } from '@/services/formProcessor';
import { mapExtractedData } from '@/services/formMapper';
import { store } from '@/lib/store';

/**
 * POST /api/webhooks/happyrobot/complete
 * Webhook callback from HappyRobot when conversation is completed.
 * Receives extracted data and maps it to form submission format.
 */
export async function POST(request: NextRequest) {
  const body = await request.json() as {
    session_id?: string;
    form_id: string;
    guard_id?: string;
    center_id?: string;
    incident_family?: string;
    incident_type?: string;
    extracted_data: Record<string, string | string[] | null>;
    transcript?: string;
  };

  if (!body.form_id || !body.extracted_data) {
    return NextResponse.json(
      { error: 'form_id and extracted_data are required' },
      { status: 400 }
    );
  }

  // Load and process form
  const rawForm = await loadFormDefinition(body.form_id);
  if (!rawForm) {
    return NextResponse.json(
      { error: `Form not found: ${body.form_id}` },
      { status: 404 }
    );
  }

  const processed = processForm(rawForm);

  // Map extracted data to form fields
  const mappingResult = mapExtractedData(processed, body.extracted_data);

  // Create or update incident
  let incident = body.session_id
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

  const missingUids = mappingResult.missingMandatory.map((f) => f.uid);
  store.updateIncidentFields(
    incident.id,
    mappingResult.fields,
    mappingResult.completionPercentage,
    missingUids,
    body.transcript
  );

  return NextResponse.json({
    success: true,
    incident_id: incident.id,
    mapping_result: {
      fields_filled: mappingResult.filledCount,
      total_active_fields: mappingResult.totalActiveFields,
      completion_percentage: mappingResult.completionPercentage,
      missing_mandatory: mappingResult.missingMandatory,
      warnings: mappingResult.warnings,
    },
    // The flat array ready for Prosegur's endpoint
    prosegur_submission: mappingResult.fields,
  });
}
