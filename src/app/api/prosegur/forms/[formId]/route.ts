import { NextRequest, NextResponse } from 'next/server';
import { loadFormDefinition } from '@/lib/formLoader';
import { FORM_NAMES } from '@/types/incident';

/**
 * GET /api/prosegur/forms/[formId]
 * Mock Prosegur API: Returns the raw form definition JSON.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;
  const formDef = loadFormDefinition(formId);

  if (!formDef) {
    return NextResponse.json(
      { error: `Form not found: ${formId}` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    formId,
    name: FORM_NAMES[formId] || formId,
    definition: formDef,
  });
}
