// ============================================================
// FormMapper — Maps AI-extracted data to Prosegur's expected
// flat [{uid, value}] submission format
// ============================================================

import {
  ProcessedForm,
  ProcessedField,
  FieldType,
  FormFieldValue,
} from '@/types/form';
import { ForkResolver, FieldAnswers } from './forkResolver';

/** Result of mapping extracted data to form submission format */
export interface MappingResult {
  /** Field values ready for submission */
  fields: FormFieldValue[];
  /** Mandatory fields that are still missing */
  missingMandatory: { uid: string; question: string }[];
  /** Fields where the value didn't match any option */
  warnings: MappingWarning[];
  /** Completion percentage (mandatory fields only) */
  completionPercentage: number;
  /** Total fields filled */
  filledCount: number;
  /** Total active fields */
  totalActiveFields: number;
}

export interface MappingWarning {
  uid: string;
  question: string;
  providedValue: string;
  expectedOptions?: string[];
  message: string;
}

export class FormMapper {
  private form: ProcessedForm;
  private forkResolver: ForkResolver;

  constructor(form: ProcessedForm) {
    this.form = form;
    this.forkResolver = new ForkResolver(form);
  }

  /**
   * Map extracted data (key-value pairs) to form submission format.
   * The extractedData keys can be UIDs or field question-based keys.
   */
  mapExtractedData(extractedData: Record<string, string | string[] | null>): MappingResult {
    const fieldValues: FormFieldValue[] = [];
    const warnings: MappingWarning[] = [];
    const answers: FieldAnswers = new Map();

    // Step 1: Match extracted data to field UIDs
    for (const [key, rawValue] of Object.entries(extractedData)) {
      if (rawValue === null || rawValue === undefined || rawValue === '') continue;

      // Try to find the field by UID directly
      let field = this.form.fieldMap.get(key);

      // If not found by UID, search by question text
      if (!field) {
        field = this.findFieldByQuestion(key);
      }

      if (!field) continue;

      // Skip attachment fields
      if (field.fieldType === FieldType.Attachment) continue;

      // Normalize the value
      const normalizedValues = this.normalizeValue(field, rawValue);

      if (normalizedValues.length === 0) continue;

      // Validate against options (for dropdown/boolean fields)
      if (field.options.length > 0) {
        const validated = this.validateAgainstOptions(field, normalizedValues);
        if (validated.matched.length > 0) {
          const value = field.multiple
            ? validated.matched.join(' | ')
            : validated.matched[0];
          fieldValues.push({ uid: field.uid, value });
          answers.set(field.uid, field.multiple ? validated.matched : validated.matched[0]);
        }
        for (const unmatched of validated.unmatched) {
          warnings.push({
            uid: field.uid,
            question: field.question,
            providedValue: unmatched,
            expectedOptions: field.options.map((o) => o.value),
            message: `El valor "${unmatched}" no coincide con ninguna opción disponible`,
          });
        }
      } else {
        // Free text, number, or datetime — use as-is
        const value = Array.isArray(normalizedValues)
          ? normalizedValues.join(' | ')
          : normalizedValues[0];

        // Format-specific validation
        const formatted = this.formatValue(field, value);
        fieldValues.push({ uid: field.uid, value: formatted });
        answers.set(field.uid, formatted);
      }
    }

    // Step 2: Resolve forks based on current answers
    const resolution = this.forkResolver.resolve(answers);

    // Step 3: Find missing mandatory fields (only from active sections)
    const missingMandatory = resolution.missingMandatoryFields
      .filter((f) => f.fieldType !== FieldType.Attachment)
      .map((f) => ({
        uid: f.uid,
        question: f.question,
      }));

    // Step 4: Filter out field values for inactive fork sections
    const activeUids = new Set(resolution.activeFields.map((f) => f.uid));
    const activeFieldValues = fieldValues.filter((fv) => activeUids.has(fv.uid));

    return {
      fields: activeFieldValues,
      missingMandatory,
      warnings,
      completionPercentage: resolution.completionPercentage,
      filledCount: activeFieldValues.length,
      totalActiveFields: resolution.activeFields.filter(
        (f) => f.fieldType !== FieldType.Attachment
      ).length,
    };
  }

  /**
   * Find a field by matching against question text (fuzzy).
   */
  private findFieldByQuestion(queryKey: string): ProcessedField | undefined {
    const normalized = queryKey
      .toLowerCase()
      .replace(/[¿?¡!:.,;()\/\-_]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    for (const field of this.form.allFields) {
      const fieldNormalized = field.question
        .toLowerCase()
        .replace(/[¿?¡!:.,;()\/\-_]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (fieldNormalized === normalized) return field;
      if (fieldNormalized.includes(normalized) || normalized.includes(fieldNormalized)) return field;
    }

    return undefined;
  }

  /**
   * Normalize a raw value into an array of individual values.
   */
  private normalizeValue(field: ProcessedField, rawValue: string | string[]): string[] {
    if (Array.isArray(rawValue)) {
      return rawValue.map((v) => v.trim()).filter((v) => v.length > 0);
    }

    const str = rawValue.trim();
    if (str.length === 0) return [];

    // For multi-select fields, try splitting by common separators
    if (field.multiple) {
      // Split by " | ", ", ", " y ", " / "
      const parts = str.split(/\s*\|\s*|\s*,\s*|\s+y\s+|\s*\/\s*/);
      return parts.map((p) => p.trim()).filter((p) => p.length > 0);
    }

    return [str];
  }

  /**
   * Validate values against field options using fuzzy matching.
   */
  private validateAgainstOptions(
    field: ProcessedField,
    values: string[]
  ): { matched: string[]; unmatched: string[] } {
    const matched: string[] = [];
    const unmatched: string[] = [];

    for (const value of values) {
      const match = this.findBestOptionMatch(field, value);
      if (match) {
        if (!matched.includes(match)) {
          matched.push(match);
        }
      } else {
        unmatched.push(value);
      }
    }

    return { matched, unmatched };
  }

  /**
   * Find the best matching option for a given value.
   */
  private findBestOptionMatch(field: ProcessedField, value: string): string | null {
    const normalizedValue = value.toLowerCase().trim();
    const options = field.options.map((o) => o.value);

    // Exact match
    const exact = options.find((o) => o.toLowerCase().trim() === normalizedValue);
    if (exact) return exact;

    // Contains match (option contains value or value contains option)
    const contains = options.find((o) => {
      const normOpt = o.toLowerCase().trim();
      return normOpt.includes(normalizedValue) || normalizedValue.includes(normOpt);
    });
    if (contains) return contains;

    // Word-level partial match (at least 2 words match)
    const valueWords = normalizedValue.split(/\s+/);
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const option of options) {
      const optionWords = option.toLowerCase().split(/\s+/);
      const matchingWords = valueWords.filter((w) =>
        optionWords.some((ow) => ow.includes(w) || w.includes(ow))
      );
      const score = matchingWords.length / Math.max(valueWords.length, optionWords.length);
      if (score > bestScore && matchingWords.length >= 2) {
        bestScore = score;
        bestMatch = option;
      }
    }

    if (bestMatch && bestScore >= 0.4) return bestMatch;

    // Boolean field shortcuts
    if (field.fieldType === FieldType.Boolean) {
      if (['sí', 'si', 'yes', 'true', 'afirmativo'].includes(normalizedValue)) {
        const yesOption = options.find((o) => o.toLowerCase().startsWith('sí') || o.toLowerCase() === 'si');
        if (yesOption) return yesOption;
      }
      if (['no', 'false', 'negativo'].includes(normalizedValue)) {
        const noOption = options.find((o) => o.toLowerCase().startsWith('no'));
        if (noOption) return noOption;
      }
    }

    return null;
  }

  /**
   * Format a value according to field type.
   */
  private formatValue(field: ProcessedField, value: string): string {
    switch (field.fieldType) {
      case FieldType.Number: {
        // Extract numeric value
        const numMatch = value.match(/[\d.,]+/);
        return numMatch ? numMatch[0].replace(',', '.') : value;
      }
      case FieldType.DateTime: {
        // If already in ISO-like format (YYYY-MM-DDTHH:mm:ss), keep as-is
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
          return value.split('.')[0]; // Strip milliseconds if present
        }
        // Otherwise try to parse
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            // Use local time components to avoid timezone shift
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            const h = String(date.getHours()).padStart(2, '0');
            const min = String(date.getMinutes()).padStart(2, '0');
            const sec = String(date.getSeconds()).padStart(2, '0');
            return `${y}-${m}-${d}T${h}:${min}:${sec}`;
          }
        } catch {
          // Fall through
        }
        return value;
      }
      default:
        return value;
    }
  }
}

/**
 * Convenience function to map extracted data.
 */
export function mapExtractedData(
  form: ProcessedForm,
  extractedData: Record<string, string | string[] | null>
): MappingResult {
  const mapper = new FormMapper(form);
  return mapper.mapExtractedData(extractedData);
}
