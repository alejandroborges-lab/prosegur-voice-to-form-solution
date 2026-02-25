import { NextRequest, NextResponse } from 'next/server';
import { loadFormDefinition } from '@/lib/formLoader';
import { processForm } from '@/services/formProcessor';
import { generatePrompt } from '@/services/promptGenerator';

/**
 * POST /api/prompts/generate
 * Generate a dynamic chatbot agent prompt for a given form.
 * This is called by HappyRobot workflow to get the prompt before starting the conversation.
 */
export async function POST(request: NextRequest) {
  const body = await request.json() as {
    form_id: string;
    incident_type: string;
    incident_family: string;
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

  return NextResponse.json({
    agent_prompt: prompt.agentPrompt,
    initial_message: prompt.initialMessage,
    form_schema: {
      form_id: body.form_id,
      incident_type: body.incident_type,
      total_fields: processed.stats.totalFields,
      mandatory_fields: processed.stats.mandatoryFields,
      fields: prompt.extractionSchema,
    },
  });
}
