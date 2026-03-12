import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { launchExtraction } from '@/services/transcriptExtractor';

/**
 * POST /api/forms/sync-transcript
 *
 * Fire & forget endpoint. The voice agent calls this tool to send the
 * current transcript. Backend responds 200 immediately and launches
 * GPT extraction in the background.
 *
 * Replaces the old "actualizar_formulario" flow where HappyRobot did
 * an AI Extract (adding ~2-3s latency) before sending campos.
 *
 * Body: { session_id, transcript, form_id? }
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const sessionId = body.session_id as string | undefined;
  const transcript = body.transcript as string | undefined;
  const formId = (body.form_id as string) || 'hurto-generico';

  if (!transcript) {
    return NextResponse.json({ error: 'Missing transcript field' }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
  }

  // Find or create incident
  let incident = sessionId ? store.findBySessionId(sessionId) : undefined;

  if (!incident) {
    incident = store.createIncident({
      formId,
      guardId: (body.guard_id as string) || 'unknown',
      centerId: (body.center_id as string) || 'unknown',
      incidentFamily: (body.incident_family as string) || 'Hurto',
      incidentType: (body.incident_type as string) || formId,
      happyRobotSessionId: sessionId,
    });
    console.log(`[sync-transcript] Created incident=${incident.id} for session=${sessionId}`);
  }

  // Store transcript on incident
  if (incident.transcript !== transcript) {
    store.updateIncidentFields(
      incident.id,
      incident.fields,
      incident.completionPercentage,
      incident.missingMandatoryFields,
      transcript
    );
  }

  // Launch background extraction (fire & forget)
  launchExtraction(incident.id, sessionId || 'unknown', transcript, formId);

  console.log(`[sync-transcript] OK: incident=${incident.id}, transcript_length=${transcript.length}`);

  return NextResponse.json({
    success: true,
    incident_id: incident.id,
    processing: true,
  });
}
