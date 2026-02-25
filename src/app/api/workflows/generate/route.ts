import { NextRequest, NextResponse } from 'next/server';
import { loadFormDefinition } from '@/lib/formLoader';
import { processForm } from '@/services/formProcessor';
import { generatePrompt } from '@/services/promptGenerator';
import { generateWorkflow } from '@/services/workflowGenerator';

/**
 * POST /api/workflows/generate
 * Generate a complete HappyRobot workflow JSON for a given form.
 */
export async function POST(request: NextRequest) {
  const body = await request.json() as {
    form_id: string;
    incident_type: string;
    incident_family: string;
    backend_url?: string;
    org_id?: string;
  };

  if (!body.form_id) {
    return NextResponse.json(
      { error: 'form_id is required' },
      { status: 400 }
    );
  }

  const rawForm = loadFormDefinition(body.form_id);
  if (!rawForm) {
    return NextResponse.json(
      { error: `Form not found: ${body.form_id}` },
      { status: 404 }
    );
  }

  const processed = processForm(rawForm);
  const prompt = generatePrompt(
    processed,
    body.incident_type || body.form_id,
    body.incident_family || 'Hurto'
  );

  const workflow = generateWorkflow(processed, prompt, {
    backendUrl: body.backend_url || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000',
    orgId: body.org_id,
    formId: body.form_id,
    incidentType: body.incident_type || body.form_id,
    incidentFamily: body.incident_family || 'Hurto',
  });

  return NextResponse.json(workflow);
}
