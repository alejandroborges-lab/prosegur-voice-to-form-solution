import { NextRequest, NextResponse } from 'next/server';
import { RawFormDefinition } from '@/types/form';
import { processForm } from '@/services/formProcessor';
import { loadFormDefinition } from '@/lib/formLoader';

/**
 * POST /api/forms/process
 * Process a form definition into a structured representation.
 * Accepts either a form_id (loads from mocks) or a raw form definition.
 */
export async function POST(request: NextRequest) {
  const body = await request.json() as {
    form_id?: string;
    definition?: RawFormDefinition;
  };

  let rawForm: RawFormDefinition | null = null;

  if (body.form_id) {
    rawForm = await loadFormDefinition(body.form_id);
    if (!rawForm) {
      return NextResponse.json(
        { error: `Form not found: ${body.form_id}` },
        { status: 404 }
      );
    }
  } else if (body.definition) {
    rawForm = body.definition;
  } else {
    return NextResponse.json(
      { error: 'Either form_id or definition is required' },
      { status: 400 }
    );
  }

  const processed = processForm(rawForm);

  // Convert Maps to plain objects for JSON serialization
  const sectionMapObj: Record<string, unknown> = {};
  for (const [key, section] of processed.sectionMap) {
    sectionMapObj[key] = {
      sectionGuid: section.sectionGuid,
      parentSectionGuid: section.parentSectionGuid,
      triggeredBy: section.triggeredBy,
      fieldCount: section.fields.length,
      childForkCount: section.childForks.length,
      isOrphaned: section.isOrphaned,
      isEmpty: section.isEmpty,
      depth: section.depth,
    };
  }

  const fieldMapObj: Record<string, unknown> = {};
  for (const [uid, field] of processed.fieldMap) {
    fieldMapObj[uid] = {
      fieldGuid: field.fieldGuid,
      question: field.question,
      fieldType: field.fieldType,
      mandatory: field.mandatory,
      multiple: field.multiple,
      optionCount: field.options.length,
      sectionGuid: field.sectionGuid,
      forkDepth: field.forkDepth,
    };
  }

  return NextResponse.json({
    stats: processed.stats,
    sectionMap: sectionMapObj,
    fieldMap: fieldMapObj,
    allFields: processed.allFields.map((f) => ({
      uid: f.uid,
      question: f.question,
      fieldType: f.fieldType,
      mandatory: f.mandatory,
      multiple: f.multiple,
      options: f.options.map((o) => o.value),
      forkDepth: f.forkDepth,
      sectionGuid: f.sectionGuid,
    })),
    mandatoryFields: processed.mandatoryFields.map((f) => ({
      uid: f.uid,
      question: f.question,
    })),
    orphanedSections: processed.orphanedSections.map((s) => ({
      sectionGuid: s.sectionGuid,
      parentSectionGuid: s.parentSectionGuid,
      fieldCount: s.fields.length,
    })),
  });
}
