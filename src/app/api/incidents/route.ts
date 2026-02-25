import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

/**
 * GET /api/incidents
 * List all incidents with optional filtering.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as 'in_progress' | 'completed' | 'submitted' | 'error' | null;
  const formId = searchParams.get('form_id');

  const incidents = store.listIncidents({
    status: status || undefined,
    formId: formId || undefined,
  });

  const stats = store.getStats();

  return NextResponse.json({
    incidents,
    stats,
    total: incidents.length,
  });
}
