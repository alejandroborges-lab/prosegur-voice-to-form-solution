import { NextRequest, NextResponse } from 'next/server';
import { loadFormDefinition } from '@/lib/formLoader';
import { processForm } from '@/services/formProcessor';
import { mapExtractedData } from '@/services/formMapper';
import { store } from '@/lib/store';
import { FieldType, ProcessedField, ProcessedForm, ProcessedSection } from '@/types/form';

/**
 * Enriched missing field — includes everything the agent needs to ask the question.
 */
interface PendingField {
  uid: string;
  question: string;
  type: string;
  mandatory: boolean;
  multiple?: boolean;
  options?: (string | { value: string; opens: string[] })[];
  /** Present for fork fields — tells when this field is active */
  condition?: { field: string; equals: string };
}

/**
 * POST /api/forms/[formId]/pending-fields
 *
 * Intelligence endpoint — OUR layer, never replaced by Prosegur.
 * Reads accumulated fields from the store (populated by actualizar_formulario)
 * and returns which mandatory fields are still missing, with full context
 * (type, options, fork conditions) so the agent can ask them correctly.
 *
 * No parameters required — the agent just calls this tool.
 * Lookup: session_id > incident_id > most recent in-progress for this form.
 *
 * Output: { missing_mandatory, missing_mandatory_count, completion_percentage, ... }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // Body might be empty — that's OK
  }

  // Load and process form
  const rawForm = loadFormDefinition(formId);
  if (!rawForm) {
    return NextResponse.json(
      { error: `Form not found: ${formId}` },
      { status: 404 }
    );
  }

  // Find incident: by session_id > incident_id > most recent in-progress
  const sessionId = body.session_id as string | undefined;
  const incidentId = body.incident_id as string | undefined;

  let incident = incidentId
    ? store.getIncident(incidentId)
    : undefined;

  if (!incident && sessionId) {
    incident = store.findBySessionId(sessionId);
  }

  if (!incident) {
    const incidents = store.listIncidents({ status: 'in_progress', formId });
    incident = incidents[0];
  }

  if (!incident) {
    // No incident yet — return all mandatory fields as missing
    const processed = processForm(rawForm);
    const mappingResult = mapExtractedData(processed, {});
    const missingMandatory: PendingField[] = mappingResult.missingMandatory.map(
      (m) => enrichField(m.uid, processed)
    );

    return NextResponse.json({
      missing_mandatory: missingMandatory,
      missing_mandatory_count: missingMandatory.length,
      completion_percentage: 0,
      filled_count: 0,
      total_active_fields: mappingResult.totalActiveFields,
    });
  }

  // Build campos from accumulated incident fields
  const campos: Record<string, string> = {};
  for (const f of incident.fields) {
    campos[f.uid] = f.value;
  }

  const processed = processForm(rawForm);
  const mappingResult = mapExtractedData(processed, campos);

  // Enrich missing mandatory fields with full context
  const missingMandatory: PendingField[] = mappingResult.missingMandatory.map(
    (m) => enrichField(m.uid, processed)
  );

  console.log(`[pending-fields] incident=${incident.id}, filled=${mappingResult.filledCount}, missing=${missingMandatory.length}, completion=${mappingResult.completionPercentage}%`);

  return NextResponse.json({
    missing_mandatory: missingMandatory,
    missing_mandatory_count: missingMandatory.length,
    completion_percentage: mappingResult.completionPercentage,
    filled_count: mappingResult.filledCount,
    total_active_fields: mappingResult.totalActiveFields,
  });
}

/**
 * Enrich a missing field UID with type, options, and fork condition.
 */
function enrichField(uid: string, form: ProcessedForm): PendingField {
  const field = form.fieldMap.get(uid);
  if (!field) {
    return { uid, question: uid, type: 'text', mandatory: true };
  }

  const result: PendingField = {
    uid: field.uid,
    question: field.question,
    type: friendlyType(field.fieldType),
    mandatory: field.mandatory,
  };

  if (field.multiple) {
    result.multiple = true;
  }

  // Add options (with fork opens info)
  if (field.options.length > 0) {
    const hasAnyFork = field.options.some(o => o.forkSectionGuid);

    if (hasAnyFork) {
      result.options = field.options.map(opt => {
        if (opt.forkSection && !opt.forkSection.isEmpty) {
          const childUids = collectAllFieldUids(opt.forkSection);
          return { value: opt.value, opens: childUids };
        }
        return opt.value;
      });
    } else {
      result.options = field.options.map(o => o.value);
    }
  }

  // Add condition (for fork fields)
  const condition = findCondition(field, form);
  if (condition) {
    result.condition = condition;
  }

  return result;
}

function findCondition(
  field: ProcessedField,
  form: ProcessedForm
): { field: string; equals: string } | undefined {
  if (field.forkDepth === 0) return undefined;

  const section = form.sectionMap.get(field.sectionGuid);
  if (!section?.triggeredBy) return undefined;

  const parentField = form.allFields.find(
    f => f.fieldGuid === section.triggeredBy!.fieldGuid
  );
  if (!parentField) return undefined;

  return {
    field: parentField.uid,
    equals: section.triggeredBy.optionValue,
  };
}

function collectAllFieldUids(section: ProcessedSection): string[] {
  const uids: string[] = [];
  for (const field of section.fields) {
    if (field.fieldType === FieldType.Attachment) continue;
    uids.push(field.uid);
    for (const option of field.options) {
      if (option.forkSection && !option.forkSection.isEmpty) {
        uids.push(...collectAllFieldUids(option.forkSection));
      }
    }
  }
  return uids;
}

function friendlyType(fieldType: FieldType): string {
  const map: Record<string, string> = {
    '1': 'datetime',
    '2': 'dropdown',
    '3': 'boolean',
    '4': 'text',
    '5': 'attachment',
    '6': 'number',
  };
  return map[fieldType] || fieldType;
}
