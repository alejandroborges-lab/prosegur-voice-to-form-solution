// ============================================================
// ForkResolver — Determines which fork sections are active
// based on the current set of field answers
// ============================================================

import {
  ProcessedForm,
  ProcessedSection,
  ProcessedField,
  ProcessedOption,
} from '@/types/form';

/** A field answer: uid → value (or array of values for multi-select) */
export type FieldAnswers = Map<string, string | string[]>;

/** Result of fork resolution */
export interface ForkResolution {
  /** All active sections (root + triggered forks) */
  activeSections: ProcessedSection[];
  /** All active fields in order (only fields from active sections) */
  activeFields: ProcessedField[];
  /** Active mandatory fields that are still missing answers */
  missingMandatoryFields: ProcessedField[];
  /** Active fork section GUIDs */
  activeForkGuids: Set<string>;
  /** Fields that have been answered */
  answeredFields: ProcessedField[];
  /** Completion percentage (mandatory fields only) */
  completionPercentage: number;
}

export class ForkResolver {
  private form: ProcessedForm;

  constructor(form: ProcessedForm) {
    this.form = form;
  }

  /**
   * Resolve which sections and fields are active given the current answers.
   */
  resolve(answers: FieldAnswers): ForkResolution {
    const activeSections: ProcessedSection[] = [];
    const activeFields: ProcessedField[] = [];
    const activeForkGuids = new Set<string>();

    // Process root sections (always active)
    for (const rootSection of this.form.rootSections) {
      this.resolveSection(rootSection, answers, activeSections, activeFields, activeForkGuids);
    }

    // Determine answered and missing mandatory fields
    const answeredFields: ProcessedField[] = [];
    const missingMandatoryFields: ProcessedField[] = [];

    for (const field of activeFields) {
      const answer = answers.get(field.uid);
      const hasAnswer = answer !== undefined && answer !== '' &&
        (Array.isArray(answer) ? answer.length > 0 : true);

      if (hasAnswer) {
        answeredFields.push(field);
      } else if (field.mandatory) {
        missingMandatoryFields.push(field);
      }
    }

    // Compute completion percentage (mandatory fields only)
    const activeMandatory = activeFields.filter((f) => f.mandatory);
    const answeredMandatory = activeMandatory.filter((f) => {
      const answer = answers.get(f.uid);
      return answer !== undefined && answer !== '' &&
        (Array.isArray(answer) ? answer.length > 0 : true);
    });
    const completionPercentage = activeMandatory.length === 0
      ? 100
      : Math.round((answeredMandatory.length / activeMandatory.length) * 100);

    return {
      activeSections,
      activeFields,
      missingMandatoryFields,
      activeForkGuids,
      answeredFields,
      completionPercentage,
    };
  }

  /**
   * Recursively resolve a section and its triggered forks.
   */
  private resolveSection(
    section: ProcessedSection,
    answers: FieldAnswers,
    activeSections: ProcessedSection[],
    activeFields: ProcessedField[],
    activeForkGuids: Set<string>
  ): void {
    activeSections.push(section);

    for (const field of section.fields) {
      activeFields.push(field);

      // Check if this field's answer triggers any fork sections
      const answer = answers.get(field.uid);
      if (!answer) continue;

      const answerValues = Array.isArray(answer) ? answer : [answer];

      for (const option of field.options) {
        if (!option.forkSectionGuid) continue;

        // Check if this option's value matches any answer value
        const isTriggered = answerValues.some((v) =>
          v.toLowerCase().trim() === option.value.toLowerCase().trim()
        );

        if (isTriggered) {
          activeForkGuids.add(option.forkSectionGuid);
          // Find the fork section and recursively resolve it
          const forkSection = this.form.sectionMap.get(option.forkSectionGuid);
          if (forkSection && !forkSection.isOrphaned) {
            this.resolveSection(forkSection, answers, activeSections, activeFields, activeForkGuids);
          }
        }
      }
    }
  }

  /**
   * Get all fields that would become active if a specific option was selected.
   * Useful for previewing fork consequences.
   */
  getFieldsForOption(field: ProcessedField, optionValue: string): ProcessedField[] {
    const option = field.options.find((o) => o.value === optionValue);
    if (!option?.forkSectionGuid) return [];

    const forkSection = this.form.sectionMap.get(option.forkSectionGuid);
    if (!forkSection) return [];

    return this.collectFieldsRecursive(forkSection);
  }

  /**
   * Collect all fields from a section and its child forks (for preview).
   */
  private collectFieldsRecursive(section: ProcessedSection): ProcessedField[] {
    const fields: ProcessedField[] = [...section.fields];
    for (const childFork of section.childForks) {
      fields.push(...this.collectFieldsRecursive(childFork));
    }
    return fields;
  }
}
