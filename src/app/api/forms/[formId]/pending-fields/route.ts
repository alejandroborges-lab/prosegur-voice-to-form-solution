import { NextRequest, NextResponse } from 'next/server';
import { loadFormDefinition } from '@/lib/formLoader';
import { processForm } from '@/services/formProcessor';
import { mapExtractedData } from '@/services/formMapper';
import { enrichField, EnrichedField } from '@/services/fieldEnricher';
import { store } from '@/lib/store';

/**
 * POST /api/forms/[formId]/pending-fields
 *
 * Intelligence endpoint — OUR layer, never replaced by Prosegur.
 * Reads accumulated fields from the store (populated by actualizar_formulario)
 * and returns which mandatory fields are still missing, with full context
 * (type, options, fork conditions) so the agent can ask them correctly.
 *
 * No parameters required — the agent just calls this tool.
 * Lookup: session_id > incident_id > most recent in-progress for this form.
 *
 * Output: { missing_mandatory, missing_mandatory_count, completion_percentage, ... }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // Body might be empty — that's OK
  }

  // Load and process form
  const rawForm = await loadFormDefinition(formId);
  if (!rawForm) {
    return NextResponse.json(
      { error: `Form not found: ${formId}` },
      { status: 404 }
    );
  }

  // Find incident: by session_id > incident_id > most recent in-progress
  const sessionId = body.session_id as string | undefined;
  const incidentId = body.incident_id as string | undefined;

  let incident = incidentId
    ? store.getIncident(incidentId)
    : undefined;

  if (!incident && sessionId) {
    incident = store.findBySessionId(sessionId);
  }

  if (!incident) {
    const incidents = store.listIncidents({ status: 'in_progress', formId });
    incident = incidents[0];
  }

  if (!incident) {
    // No incident yet — return all mandatory fields as missing
    const processed = processForm(rawForm);
    const mappingResult = mapExtractedData(processed, {});
    const missingMandatory: EnrichedField[] = mappingResult.missingMandatory.map(
      (m) => enrichField(m.uid, processed)
    );

    return NextResponse.json({
      missing_mandatory: missingMandatory,
      missing_mandatory_count: missingMandatory.length,
      completion_percentage: 0,
      filled_count: 0,
      total_active_fields: mappingResult.totalActiveFields,
    });
  }

  // Build campos from accumulated incident fields
  const campos: Record<string, string> = {};
  for (const f of incident.fields) {
    campos[f.uid] = f.value;
  }

  const processed = processForm(rawForm);
  const mappingResult = mapExtractedData(processed, campos);

  // Enrich missing mandatory fields with full context
  const missingMandatory: EnrichedField[] = mappingResult.missingMandatory.map(
    (m) => enrichField(m.uid, processed)
  );

  console.log(`[pending-fields] incident=${incident.id}, filled=${mappingResult.filledCount}, missing=${missingMandatory.length}, completion=${mappingResult.completionPercentage}%`);

  return NextResponse.json({
    missing_mandatory: missingMandatory,
    missing_mandatory_count: missingMandatory.length,
    completion_percentage: mappingResult.completionPercentage,
    filled_count: mappingResult.filledCount,
    total_active_fields: mappingResult.totalActiveFields,
  });
}
