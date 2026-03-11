import { NextRequest, NextResponse } from 'next/server';

const HAPPYROBOT_WEBHOOK = 'https://workflows.platform.happyrobot.ai/hooks/a7iuex42x3sj';

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

  const res = await fetch(HAPPYROBOT_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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
