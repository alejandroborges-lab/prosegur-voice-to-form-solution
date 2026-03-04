import { FieldType, ProcessedField, ProcessedForm, ProcessedSection } from '@/types/form';

/**
 * Enriched field — includes everything the agent needs to ask a question
 * or understand a form field's context.
 */
export interface EnrichedField {
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
 * Map a FieldType enum to a human-readable string.
 */
export function friendlyType(fieldType: FieldType): string {
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

/**
 * Recursively collect all non-attachment field UIDs from a section and its child forks.
 */
export function collectAllFieldUids(section: ProcessedSection): string[] {
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

/**
 * Find the fork condition for a field (which parent option activates it).
 */
export function findCondition(
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

/**
 * Enrich a field UID with full context: question, type, options (with fork opens), condition.
 */
export function enrichField(uid: string, form: ProcessedForm): EnrichedField {
  const field = form.fieldMap.get(uid);
  if (!field) {
    return { uid, question: uid, type: 'text', mandatory: true };
  }

  const result: EnrichedField = {
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
