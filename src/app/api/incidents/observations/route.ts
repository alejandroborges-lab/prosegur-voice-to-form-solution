import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

/**
 * POST /api/incidents/observations
 * Called by HappyRobot's final extract node to attach HTML observations to an incident.
 *
 * Lookup priority (same as /finalize):
 * 1. incident_id — exact match
 * 2. session_id — HappyRobot session
 * 3. Most recent incident (fallback)
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  console.log('[incidents/observations] Body keys:', Object.keys(body));

  // Extract observations — handle both direct string and HappyRobot extract wrapper
  let observations: string | undefined;
  if (typeof body.observations === 'string') {
    observations = body.observations;
  } else if (typeof body.response === 'object' && body.response !== null) {
    const resp = body.response as Record<string, unknown>;
    if (typeof resp.observations === 'string') {
      observations = resp.observations;
    }
  }

  if (!observations) {
    return NextResponse.json(
      { error: 'Missing observations field (string with HTML content)' },
      { status: 400 }
    );
  }

  // Find incident: by incident_id > session_id > most recent
  const incidentId = body.incident_id as string | undefined;
  const sessionId = body.session_id as string | undefined;

  let incident = incidentId ? store.getIncident(incidentId) : undefined;

  if (!incident && sessionId) {
    incident = store.findBySessionId(sessionId);
  }

  if (!incident) {
    // Fallback: most recent incident
    const all = store.listIncidents();
    incident = all[0];
    if (incident) {
      console.log('[incidents/observations] WARNING: using fallback (most recent incident). Pass session_id for safety.');
    }
  }

  if (!incident) {
    return NextResponse.json(
      { error: 'No incident found to attach observations' },
      { status: 404 }
    );
  }

  store.setObservations(incident.id, observations);

  console.log(`[incidents/observations] OK: incident=${incident.id}, html_length=${observations.length}`);

  return NextResponse.json({
    success: true,
    incident_id: incident.id,
    observations_length: observations.length,
  });
}
