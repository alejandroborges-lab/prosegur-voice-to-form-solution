import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'prosegur-voice-to-form',
    timestamp: new Date().toISOString(),
  });
}
