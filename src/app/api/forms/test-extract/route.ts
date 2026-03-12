import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { loadFormDefinition } from '@/lib/formLoader';
import { processForm } from '@/services/formProcessor';
import { EnrichedField, collectAllFieldUids, friendlyType } from '@/services/fieldEnricher';
import { FieldType, ProcessedForm, ProcessedSection, ProcessedField } from '@/types/form';

/**
 * POST /api/forms/test-extract
 * SYNCHRONOUS debug endpoint — calls GPT and returns result directly.
 * Body: { form_id, transcript }
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const formId = (body.form_id as string) || '76';
  const transcript = body.transcript as string;

  if (!transcript) {
    return NextResponse.json({ error: 'Missing transcript' }, { status: 400 });
  }

  const steps: string[] = [];

  // Step 1: Check API key
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not set', steps });
  }
  steps.push(`OPENAI_API_KEY set (starts with ${process.env.OPENAI_API_KEY.slice(0, 8)}...)`);

  // Step 2: Load form
  const rawForm = await loadFormDefinition(formId);
  if (!rawForm) {
    steps.push(`loadFormDefinition("${formId}") returned null`);
    return NextResponse.json({ error: `Form not found: ${formId}`, steps });
  }
  steps.push(`Form loaded: ${formId}, ${Array.isArray(rawForm) ? rawForm.length : 0} sections`);

  // Step 3: Process form
  const processed = processForm(rawForm);
  const fields: EnrichedField[] = [];
  for (const section of processed.rootSections) {
    emitSection(section, fields, undefined);
  }
  steps.push(`Form processed: ${fields.length} fields, ${processed.mandatoryFields.length} mandatory`);

  const formDefinition = JSON.stringify(fields, null, 2);

  // Step 4: Call GPT
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const startTime = Date.now();
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content: `Eres un extractor de datos para formularios de incidencias de seguridad de Prosegur.

Analiza el transcript y extrae TODA la información relevante, mapéala a los UIDs del formulario.

Fecha actual: ${new Date().toISOString()}

Reglas:
- datetime → ISO 8601: YYYY-MM-DDTHH:mm:ss
- dropdown → Texto EXACTO de las opciones
- boolean → "Sí" o "No"
- text → Texto libre
- number → Solo el número
- multiple: true → Separados por " | "

Definición del formulario:
${formDefinition}`,
        },
        { role: 'user', content: `Transcript:\n\n${transcript}` },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'form_fields',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              campos: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    uid: { type: 'string' },
                    value: { type: 'string' },
                  },
                  required: ['uid', 'value'],
                  additionalProperties: false,
                },
              },
            },
            required: ['campos'],
            additionalProperties: false,
          },
        },
      },
    });

    const elapsed = Date.now() - startTime;
    const content = response.choices[0]?.message?.content;
    steps.push(`GPT responded in ${elapsed}ms`);

    if (!content) {
      steps.push('GPT returned empty content');
      return NextResponse.json({ error: 'Empty GPT response', steps });
    }

    const parsed = JSON.parse(content);
    steps.push(`Parsed ${parsed.campos?.length || 0} campos`);

    return NextResponse.json({
      success: true,
      steps,
      campos: parsed.campos,
      elapsed_ms: elapsed,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    steps.push(`GPT ERROR: ${errorMessage}`);
    return NextResponse.json({ error: errorMessage, steps }, { status: 500 });
  }
}

function emitSection(
  section: ProcessedSection,
  out: EnrichedField[],
  condition: { field: string; equals: string } | undefined
): void {
  for (const field of section.fields) {
    if (field.fieldType === FieldType.Attachment) continue;
    const agentField: EnrichedField = {
      uid: field.uid, question: field.question,
      type: friendlyType(field.fieldType), mandatory: field.mandatory,
    };
    if (field.multiple) agentField.multiple = true;
    if (condition) agentField.condition = condition;
    if (field.options.length > 0) {
      agentField.options = field.options.map(o => o.value);
    }
    out.push(agentField);
    for (const option of field.options) {
      if (!option.forkSection || option.forkSection.isEmpty) continue;
      emitSection(option.forkSection, out, { field: field.uid, equals: option.value });
    }
  }
}
