import { NextRequest, NextResponse } from 'next/server';
import { loadFormDefinition } from '@/lib/formLoader';
import { processForm } from '@/services/formProcessor';
import { EnrichedField, collectAllFieldUids, friendlyType } from '@/services/fieldEnricher';
import { FORM_NAMES } from '@/types/incident';
import { FieldType, ProcessedForm, ProcessedSection, ProcessedField } from '@/types/form';

interface AgentFormResponse {
  formId: string;
  name: string;
  totalFields: number;
  mandatoryFields: number;
  fields: EnrichedField[];
}

/**
 * GET /api/prosegur/forms/[formId]/agent
 *
 * Returns the form definition in a flat, agent-friendly format:
 * - Computed UIDs ready to use in `campos`
 * - Fork fields expressed as simple conditions
 * - Options that trigger forks include an `opens` array with the child field UIDs
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;
  const rawForm = await loadFormDefinition(formId);

  if (!rawForm) {
    return NextResponse.json(
      { error: `Form not found: ${formId}` },
      { status: 404 }
    );
  }

  const processed = processForm(rawForm);
  const fields = buildAgentFields(processed);

  const response: AgentFormResponse = {
    formId,
    name: FORM_NAMES[formId] || formId,
    totalFields: fields.length,
    mandatoryFields: fields.filter(f => f.mandatory).length,
    fields,
  };

  return NextResponse.json(response);
}

/**
 * Convert a ProcessedForm into a flat list of AgentFields.
 * Walks the section tree, emitting root fields first, then fork fields
 * with their conditions.
 */
function buildAgentFields(form: ProcessedForm): EnrichedField[] {
  const fields: EnrichedField[] = [];

  for (const section of form.rootSections) {
    emitSection(section, fields, undefined);
  }

  return fields;
}

/**
 * Recursively emit fields from a section and its fork children.
 */
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

    if (field.multiple) {
      agentField.multiple = true;
    }

    if (condition) {
      agentField.condition = condition;
    }

    // Build options, marking which ones open forks
    if (field.options.length > 0) {
      const forkChildUids = collectForkChildUids(field);
      const hasAnyFork = field.options.some(o => o.forkSectionGuid);

      if (hasAnyFork) {
        // Mixed format: some options open forks
        agentField.options = field.options.map(opt => {
          const childUids = forkChildUids.get(opt.value);
          if (childUids && childUids.length > 0) {
            return { value: opt.value, opens: childUids };
          }
          return opt.value;
        });
      } else {
        // Simple string array
        agentField.options = field.options.map(o => o.value);
      }
    }

    out.push(agentField);

    // Emit fork sections triggered by this field's options
    for (const option of field.options) {
      if (!option.forkSection || option.forkSection.isEmpty) continue;
      emitSection(
        option.forkSection,
        out,
        { field: field.uid, equals: option.value }
      );
    }
  }
}

/**
 * For a given field, collect the UIDs of all child fields in each fork section.
 */
function collectForkChildUids(field: ProcessedField): Map<string, string[]> {
  const result = new Map<string, string[]>();

  for (const option of field.options) {
    if (!option.forkSection || option.forkSection.isEmpty) continue;
    const uids = collectAllFieldUids(option.forkSection);
    result.set(option.value, uids);
  }

  return result;
}

