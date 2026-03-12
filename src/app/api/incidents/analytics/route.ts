import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { CallAnalytics } from '@/types/incident';

/**
 * POST /api/incidents/analytics
 * Called by HappyRobot's extract node to attach call analytics to an incident.
 *
 * Lookup priority (same as /observations):
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

  console.log('[incidents/analytics] Body:', JSON.stringify(body).slice(0, 500));

  // HappyRobot extract may wrap values in a response object
  const src = (typeof body.response === 'object' && body.response !== null)
    ? { ...body, ...(body.response as Record<string, unknown>) }
    : body;

  // Validate required analytics fields
  const validSeverities = ['low', 'medium', 'high', 'critical'];
  const validCategories = ['theft', 'assault', 'vandalism', 'intrusion', 'other'];
  const validSentiments = ['calm', 'stressed', 'urgent'];

  const severity = String(src.severity || '').trim().toLowerCase();
  const summary = String(src.summary || '').trim();
  const incident_category = String(src.incident_category || '').trim().toLowerCase();

  if (!severity || !validSeverities.includes(severity)) {
    return NextResponse.json({ error: `Invalid severity "${severity}". Must be one of: ${validSeverities.join(', ')}` }, { status: 400 });
  }
  if (!summary) {
    return NextResponse.json({ error: 'Missing summary field' }, { status: 400 });
  }
  if (!incident_category || !validCategories.includes(incident_category)) {
    return NextResponse.json({ error: `Invalid incident_category "${incident_category}". Must be one of: ${validCategories.join(', ')}` }, { status: 400 });
  }

  const guard_sentiment = String(src.guard_sentiment || 'calm').trim().toLowerCase();
  if (!validSentiments.includes(guard_sentiment)) {
    return NextResponse.json({ error: `Invalid guard_sentiment. Must be one of: ${validSentiments.join(', ')}` }, { status: 400 });
  }

  const analytics: CallAnalytics = {
    severity: severity as CallAnalytics['severity'],
    summary,
    incident_category: incident_category as CallAnalytics['incident_category'],
    police_involved: src.police_involved === true || String(src.police_involved) === 'true',
    injuries_reported: src.injuries_reported === true || String(src.injuries_reported) === 'true',
    estimated_value: Number(src.estimated_value) || 0,
    guard_sentiment: guard_sentiment as CallAnalytics['guard_sentiment'],
    reask_count: Number(src.reask_count) || 0,
  };

  // Find incident: by incident_id > session_id > most recent
  const incidentId = body.incident_id as string | undefined;
  const sessionId = body.session_id as string | undefined;

  let incident = incidentId ? store.getIncident(incidentId) : undefined;

  if (!incident && sessionId) {
    incident = store.findBySessionId(sessionId);
  }

  if (!incident) {
    const all = store.listIncidents();
    incident = all[0];
    if (incident) {
      console.log('[incidents/analytics] WARNING: using fallback (most recent incident). Pass session_id for safety.');
    }
  }

  if (!incident) {
    return NextResponse.json({ error: 'No incident found to attach analytics' }, { status: 404 });
  }

  store.setAnalytics(incident.id, analytics);

  console.log(`[incidents/analytics] OK: incident=${incident.id}, severity=${analytics.severity}, category=${analytics.incident_category}`);

  return NextResponse.json({
    success: true,
    incident_id: incident.id,
    analytics,
  });
}
