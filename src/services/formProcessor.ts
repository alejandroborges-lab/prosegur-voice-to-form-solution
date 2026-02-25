// ============================================================
// FormProcessor — Parses raw Prosegur form JSON into a structured
// representation with resolved fork/branch relationships
// ============================================================

import {
  RawFormDefinition,
  RawFormSection,
  RawFormField,
  RawFormOption,
  FieldType,
  ProcessedForm,
  ProcessedSection,
  ProcessedField,
  ProcessedOption,
} from '@/types/form';

/** UID strategy: how to compute a field's unique ID within the fork chain */
export type UidStrategy = (sectionChain: string[], fieldGuid: string) => string;

/** Default UID strategy: concatenate section chain + field GUID with hyphens */
export const defaultUidStrategy: UidStrategy = (sectionChain, fieldGuid) => {
  if (sectionChain.length <= 1) {
    // Root section field — just the field GUID
    return fieldGuid;
  }
  // Fork field — concatenate fork section GUIDs (skip root) + field GUID
  const forkChain = sectionChain.slice(1);
  return [...forkChain, fieldGuid].join('-');
};

export class FormProcessor {
  private sectionMap: Map<string, ProcessedSection> = new Map();
  private fieldMap: Map<string, ProcessedField> = new Map();
  private allFields: ProcessedField[] = [];
  private uidStrategy: UidStrategy;

  constructor(uidStrategy: UidStrategy = defaultUidStrategy) {
    this.uidStrategy = uidStrategy;
  }

  /**
   * Process a raw form definition into a fully resolved structure.
   * This is the main entry point.
   */
  process(raw: RawFormDefinition): ProcessedForm {
    // Reset state
    this.sectionMap = new Map();
    this.fieldMap = new Map();
    this.allFields = [];

    // Step 1: Build a lookup of raw sections by GUID
    const rawSectionMap = new Map<string, RawFormSection>();
    for (const section of raw) {
      rawSectionMap.set(section.SectionGuid, section);
    }

    // Step 2: Build a map of ForkGuid → { triggering fieldGuid, option value, parent section GUID }
    const forkTriggerMap = new Map<string, { fieldGuid: string; optionValue: string; parentSectionGuid: string }>();
    for (const section of raw) {
      if (!section.DForm_Fields) continue;
      for (const field of section.DForm_Fields) {
        if (!field.Options) continue;
        for (const option of field.Options) {
          if (option.ForkGuid) {
            forkTriggerMap.set(option.ForkGuid, {
              fieldGuid: field.FieldGuid,
              optionValue: option.Value,
              parentSectionGuid: section.SectionGuid,
            });
          }
        }
      }
    }

    // Step 3: Identify root sections (no SectionParentGuid)
    const rootRawSections = raw.filter((s) => !s.SectionParentGuid);
    const forkRawSections = raw.filter((s) => !!s.SectionParentGuid);

    // Step 4: Process root sections recursively
    const rootSections: ProcessedSection[] = [];
    for (const rawSection of rootRawSections) {
      const processed = this.processSection(rawSection, rawSectionMap, forkTriggerMap, [], 0);
      rootSections.push(processed);
    }

    // Step 5: Identify orphaned sections — have SectionParentGuid but no ForkGuid trigger
    const orphanedSections: ProcessedSection[] = [];
    for (const rawSection of forkRawSections) {
      if (!this.sectionMap.has(rawSection.SectionGuid)) {
        // This section was never processed (not referenced by any ForkGuid)
        const orphan = this.createOrphanSection(rawSection);
        orphanedSections.push(orphan);
        this.sectionMap.set(rawSection.SectionGuid, orphan);
      }
    }

    // Step 6: Compute stats
    const mandatoryFields = this.allFields.filter((f) => f.mandatory);
    let maxForkDepth = 0;
    for (const section of this.sectionMap.values()) {
      if (section.depth > maxForkDepth) maxForkDepth = section.depth;
    }

    const emptyForks = Array.from(this.sectionMap.values()).filter(
      (s) => s.parentSectionGuid !== null && s.isEmpty
    ).length;

    return {
      rootSections,
      sectionMap: this.sectionMap,
      fieldMap: this.fieldMap,
      allFields: this.allFields,
      mandatoryFields,
      orphanedSections,
      stats: {
        totalSections: this.sectionMap.size,
        rootSections: rootSections.length,
        forkSections: forkRawSections.length,
        emptyForks,
        orphanedSections: orphanedSections.length,
        totalFields: this.allFields.length,
        mandatoryFields: mandatoryFields.length,
        maxForkDepth,
      },
    };
  }

  /**
   * Recursively process a section and its fork children.
   */
  private processSection(
    rawSection: RawFormSection,
    rawSectionMap: Map<string, RawFormSection>,
    forkTriggerMap: Map<string, { fieldGuid: string; optionValue: string; parentSectionGuid: string }>,
    parentChain: string[],
    depth: number
  ): ProcessedSection {
    const sectionChain = [...parentChain, rawSection.SectionGuid];
    const trigger = forkTriggerMap.get(rawSection.SectionGuid);

    const processedSection: ProcessedSection = {
      sectionGuid: rawSection.SectionGuid,
      parentSectionGuid: rawSection.SectionParentGuid ?? null,
      triggeredBy: trigger
        ? { fieldGuid: trigger.fieldGuid, optionValue: trigger.optionValue }
        : undefined,
      fields: [],
      childForks: [],
      isOrphaned: false,
      isEmpty: !rawSection.DForm_Fields || rawSection.DForm_Fields.length === 0,
      depth,
    };

    // Process fields
    if (rawSection.DForm_Fields) {
      for (const rawField of rawSection.DForm_Fields) {
        const processedField = this.processField(
          rawField,
          rawSection.SectionGuid,
          sectionChain,
          depth,
          rawSectionMap,
          forkTriggerMap
        );
        processedSection.fields.push(processedField);
        this.allFields.push(processedField);
        this.fieldMap.set(processedField.uid, processedField);
      }
    }

    // Collect child fork sections (found through field options with ForkGuid)
    if (rawSection.DForm_Fields) {
      for (const rawField of rawSection.DForm_Fields) {
        if (!rawField.Options) continue;
        for (const option of rawField.Options) {
          if (!option.ForkGuid) continue;
          const forkRaw = rawSectionMap.get(option.ForkGuid);
          if (forkRaw) {
            // Check if already processed (avoid duplicates)
            if (!this.sectionMap.has(forkRaw.SectionGuid)) {
              const childFork = this.processSection(
                forkRaw,
                rawSectionMap,
                forkTriggerMap,
                sectionChain,
                depth + 1
              );
              processedSection.childForks.push(childFork);
            }
          }
        }
      }
    }

    this.sectionMap.set(rawSection.SectionGuid, processedSection);
    return processedSection;
  }

  /**
   * Process a single field, resolving its options and fork references.
   */
  private processField(
    rawField: RawFormField,
    sectionGuid: string,
    sectionChain: string[],
    depth: number,
    rawSectionMap: Map<string, RawFormSection>,
    forkTriggerMap: Map<string, { fieldGuid: string; optionValue: string; parentSectionGuid: string }>
  ): ProcessedField {
    const uid = this.uidStrategy(sectionChain, rawField.FieldGuid);

    const options: ProcessedOption[] = (rawField.Options ?? []).map((opt) =>
      this.processOption(opt, rawSectionMap, forkTriggerMap, sectionChain, depth)
    );

    return {
      fieldGuid: rawField.FieldGuid,
      question: rawField.Question,
      fieldType: rawField.FieldType as FieldType,
      mandatory: rawField.Mandatory ?? false,
      multiple: rawField.Multiple ?? false,
      options,
      sectionGuid,
      uid,
      forkDepth: depth,
      sectionChain: [...sectionChain],
    };
  }

  /**
   * Process a single option, resolving any fork section reference.
   */
  private processOption(
    rawOption: RawFormOption,
    rawSectionMap: Map<string, RawFormSection>,
    forkTriggerMap: Map<string, { fieldGuid: string; optionValue: string; parentSectionGuid: string }>,
    parentSectionChain: string[],
    parentDepth: number
  ): ProcessedOption {
    const processed: ProcessedOption = {
      value: rawOption.Value,
    };

    if (rawOption.ForkGuid) {
      processed.forkSectionGuid = rawOption.ForkGuid;
      const forkSection = this.sectionMap.get(rawOption.ForkGuid);
      if (forkSection) {
        processed.forkSection = forkSection;
      }
    }

    return processed;
  }

  /**
   * Create an orphaned section placeholder.
   */
  private createOrphanSection(rawSection: RawFormSection): ProcessedSection {
    const sectionChain = [rawSection.SectionGuid];

    const fields: ProcessedField[] = (rawSection.DForm_Fields ?? []).map((rawField) => {
      const uid = this.uidStrategy(sectionChain, rawField.FieldGuid);
      const field: ProcessedField = {
        fieldGuid: rawField.FieldGuid,
        question: rawField.Question,
        fieldType: rawField.FieldType as FieldType,
        mandatory: rawField.Mandatory ?? false,
        multiple: rawField.Multiple ?? false,
        options: (rawField.Options ?? []).map((opt) => ({
          value: opt.Value,
          forkSectionGuid: opt.ForkGuid,
        })),
        sectionGuid: rawSection.SectionGuid,
        uid,
        forkDepth: 0,
        sectionChain: [...sectionChain],
      };
      return field;
    });

    return {
      sectionGuid: rawSection.SectionGuid,
      parentSectionGuid: rawSection.SectionParentGuid ?? null,
      fields,
      childForks: [],
      isOrphaned: true,
      isEmpty: fields.length === 0,
      depth: 0,
    };
  }
}

/**
 * Convenience function to process a raw form definition.
 */
export function processForm(
  raw: RawFormDefinition,
  uidStrategy?: UidStrategy
): ProcessedForm {
  const processor = new FormProcessor(uidStrategy);
  return processor.process(raw);
}
