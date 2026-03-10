import { NextRequest, NextResponse } from 'next/server';

const HAPPYROBOT_WEBHOOK = 'https://workflows.platform.happyrobot.ai/hooks/a7iuex42x3sj/d8yqiqsas05z';

/**
 * POST /api/call/trigger
 * Proxy to HappyRobot webhook to avoid CORS issues from the browser.
 */
export async function POST(request: NextRequest) {
  const body = await request.json() as {
    guard_id: string;
    center_id: string;
    phone_number: string;
    incident_type: string;
    incident_family: string;
  };

  const form = new FormData();
  form.append('guard_id', body.guard_id);
  form.append('center_id', body.center_id);
  form.append('phone_number', body.phone_number);
  form.append('incident_type', body.incident_type);
  form.append('incident_family', body.incident_family);

  const res = await fetch(HAPPYROBOT_WEBHOOK, {
    method: 'POST',
    body: form,
  });

  const text = await res.text();

  if (!res.ok) {
    return NextResponse.json(
      { error: `HappyRobot responded with ${res.status}: ${text}` },
      { status: res.status }
    );
  }

  return NextResponse.json({ success: true, response: text });
}
