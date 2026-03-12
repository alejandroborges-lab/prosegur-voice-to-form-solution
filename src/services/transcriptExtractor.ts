// ============================================================
// Transcript Extractor — Async field extraction via OpenAI
//
// Receives a transcript, calls GPT in the background to extract
// form fields, and stores them. Tracks in-flight promises so
// pending-fields can wait for processing to complete.
//
// Debouncing: if multiple sync-transcript calls arrive quickly,
// only the LAST one is processed (newest transcript = superset).
// ============================================================

import OpenAI from 'openai';
import { loadFormDefinition } from '@/lib/formLoader';
import { processForm } from '@/services/formProcessor';
import { mapExtractedData } from '@/services/formMapper';
import { store } from '@/lib/store';
import { EnrichedField, collectAllFieldUids, friendlyType } from '@/services/fieldEnricher';
import { FieldType, ProcessedForm, ProcessedSection, ProcessedField } from '@/types/form';

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

const EXTRACT_MODEL = 'gpt-4.1';

// ============================================================
// In-flight extraction tracking per incident
// Uses a version counter to prevent stale deletions.
// ============================================================

interface ExtractionState {
  promise: Promise<void>;
  version: number;
}

const inflightExtractions = new Map<string, ExtractionState>();
const extractionVersions = new Map<string, number>();

/** Check if there's an extraction in progress for this incident */
export function isExtracting(incidentId: string): boolean {
  return inflightExtractions.has(incidentId);
}

/** Wait for any in-flight extraction to complete for this incident */
export async function waitForExtraction(incidentId: string, timeoutMs = 15000): Promise<boolean> {
  const state = inflightExtractions.get(incidentId);
  if (!state) return false;

  try {
    await Promise.race([
      state.promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ]);
    return true;
  } catch {
    return true;
  }
}

// ============================================================
// Form definition builder (same logic as agent endpoint)
// ============================================================

function buildFormDefinitionForPrompt(form: ProcessedForm): string {
  const fields: EnrichedField[] = [];
  for (const section of form.rootSections) {
    emitSection(section, fields, undefined);
  }
  return JSON.stringify(fields, null, 2);
}

function emitSection(
  section: ProcessedSection,
  out: EnrichedField[],
  condition: { field: string; equals: string } | undefined
): void {
  for (const field of section.fields) {
    if (field.fieldType === FieldType.Attachment) continue;

    const agentField: EnrichedField = {
      uid: field.uid,
      question: field.question,
      type: friendlyType(field.fieldType),
      mandatory: field.mandatory,
    };

    if (field.multiple) agentField.multiple = true;
    if (condition) agentField.condition = condition;

    if (field.options.length > 0) {
      const forkChildUids = collectForkChildUids(field);
      const hasAnyFork = field.options.some(o => o.forkSectionGuid);

      if (hasAnyFork) {
        agentField.options = field.options.map(opt => {
          const childUids = forkChildUids.get(opt.value);
          if (childUids && childUids.length > 0) {
            return { value: opt.value, opens: childUids };
          }
          return opt.value;
        });
      } else {
        agentField.options = field.options.map(o => o.value);
      }
    }

    out.push(agentField);

    for (const option of field.options) {
      if (!option.forkSection || option.forkSection.isEmpty) continue;
      emitSection(option.forkSection, out, { field: field.uid, equals: option.value });
    }
  }
}

function collectForkChildUids(field: ProcessedField): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const option of field.options) {
    if (!option.forkSection || option.forkSection.isEmpty) continue;
    const uids = collectAllFieldUids(option.forkSection);
    result.set(option.value, uids);
  }
  return result;
}

// ============================================================
// GPT extraction
// ============================================================

async function callGPTExtract(
  transcript: string,
  formDefinition: string
): Promise<Array<{ uid: string; value: string }>> {
  const systemPrompt = `Eres un extractor de datos para formularios de incidencias de seguridad de Prosegur.

## Tu tarea

Analiza el transcript de la conversación entre un vigilante de seguridad y un asistente de IA. Extrae TODA la información relevante y mapéala a los UIDs del formulario.

## Fecha actual

La fecha y hora actual es: ${new Date().toISOString()}

Cuando el vigilante diga "hoy", "esta mañana", "hace un rato", usa esta fecha.

## Reglas de mapeo por tipo de campo

- \`datetime\` → Formato ISO 8601: YYYY-MM-DDTHH:mm:ss
- \`dropdown\` → Texto EXACTO de una de las opciones listadas. No parafrasees — copia la opción tal cual
- \`boolean\` → Texto EXACTO de la opción (ej: "Sí", "No", "No, sin información")
- \`text\` → Texto libre tal cual lo dijo el vigilante
- \`number\` → Solo el número como string (ej: "200", "50")
- Campos con \`multiple: true\` → Valores separados por " | " (ej: "Policía Nacional | Policía Local")

## Bifurcaciones (campos condicionales)

Los campos con \`condition\` solo aplican cuando el campo padre tiene el valor indicado. Solo incluye campos condicionales si el valor del campo padre coincide.

## Definición del formulario

${formDefinition}`;

  const response = await getOpenAI().chat.completions.create({
    model: EXTRACT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
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

  const content = response.choices[0]?.message?.content;
  if (!content) return [];

  const parsed = JSON.parse(content);
  return parsed.campos || [];
}

// ============================================================
// Main entry point — fire & forget with debounce
// ============================================================

export function launchExtraction(
  incidentId: string,
  sessionId: string,
  transcript: string,
  formId: string
): void {
  // Increment version — this is the "generation" of this extraction
  const currentVersion = (extractionVersions.get(incidentId) || 0) + 1;
  extractionVersions.set(incidentId, currentVersion);

  const startTime = Date.now();
  console.log(`[transcript-extractor] Launching extraction v${currentVersion} for incident=${incidentId}, transcript_length=${transcript.length}`);

  const promise = (async () => {
    // Small delay to debounce rapid calls — if a newer version arrives
    // within 500ms, this one will abort
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if we're still the latest version
    if (extractionVersions.get(incidentId) !== currentVersion) {
      console.log(`[transcript-extractor] v${currentVersion} skipped (superseded by v${extractionVersions.get(incidentId)})`);
      return;
    }

    try {
      // Load form
      const rawForm = await loadFormDefinition(formId);
      if (!rawForm) {
        console.error('[transcript-extractor] Form not found:', formId);
        return;
      }

      const processed = processForm(rawForm);
      const formDefinition = buildFormDefinitionForPrompt(processed);

      // Check again before expensive GPT call
      if (extractionVersions.get(incidentId) !== currentVersion) {
        console.log(`[transcript-extractor] v${currentVersion} skipped before GPT call`);
        return;
      }

      // Call GPT
      const campos = await callGPTExtract(transcript, formDefinition);

      // Check AGAIN after GPT — a newer extraction may have started
      if (extractionVersions.get(incidentId) !== currentVersion) {
        console.log(`[transcript-extractor] v${currentVersion} result discarded (superseded)`);
        return;
      }

      if (campos.length === 0) {
        console.log('[transcript-extractor] No fields extracted');
        return;
      }

      // Map and store
      const camposRecord: Record<string, string> = {};
      for (const { uid, value } of campos) {
        camposRecord[uid] = value;
      }
      const mappingResult = mapExtractedData(processed, camposRecord);
      store.mergeIncidentFields(incidentId, mappingResult.fields);

      // Recalculate completion
      const updated = store.getIncident(incidentId);
      if (updated) {
        const allFieldsRecord: Record<string, string> = {};
        for (const f of updated.fields) {
          allFieldsRecord[f.uid] = f.value;
        }
        const totalMapping = mapExtractedData(processed, allFieldsRecord);
        store.mergeIncidentFields(incidentId, [], totalMapping.completionPercentage);

        const elapsed = Date.now() - startTime;
        console.log(`[transcript-extractor] v${currentVersion} done in ${elapsed}ms: ${campos.length} fields, completion=${totalMapping.completionPercentage}%`);
      }
    } catch (err) {
      console.error(`[transcript-extractor] v${currentVersion} error:`, err);
    } finally {
      // Only clean up if we're still the active version
      if (extractionVersions.get(incidentId) === currentVersion) {
        inflightExtractions.delete(incidentId);
      }
    }
  })();

  inflightExtractions.set(incidentId, { promise, version: currentVersion });
}
