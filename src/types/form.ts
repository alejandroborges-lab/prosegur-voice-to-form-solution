// ============================================================
// Prosegur Form Definition Types
// Maps directly to the JSON structure from Prosegur's API
// ============================================================

/** Raw option within a form field */
export interface RawFormOption {
  Value: string;
  /** If present, this option triggers a conditional fork section */
  ForkGuid?: string;
}

/** Raw form field as received from Prosegur API */
export interface RawFormField {
  FieldGuid: string;
  Question: string;
  /** 1=DateTime, 2=Dropdown, 3=Boolean/YesNo, 4=FreeText, 5=Attachment, 6=Number */
  FieldType: string;
  Mandatory?: boolean;
  /** Whether multiple options can be selected (for Type 2 dropdowns) */
  Multiple?: boolean;
  Options?: RawFormOption[];
}

/** Raw section as received from Prosegur API */
export interface RawFormSection {
  SectionGuid: string;
  /** If present, this section is a fork triggered by a parent section's field option */
  SectionParentGuid?: string;
  /** Fields within this section. May be absent for empty fork sections */
  DForm_Fields?: RawFormField[];
}

/** The complete raw form definition (array of sections) */
export type RawFormDefinition = RawFormSection[];

// ============================================================
// Processed Form Types (after FormProcessor processes the raw JSON)
// ============================================================

export enum FieldType {
  DateTime = '1',
  Dropdown = '2',
  Boolean = '3',
  FreeText = '4',
  Attachment = '5',
  Number = '6',
}

export const FIELD_TYPE_LABELS: Record<string, string> = {
  '1': 'Fecha/Hora',
  '2': 'Selección',
  '3': 'Sí/No',
  '4': 'Texto libre',
  '5': 'Adjunto',
  '6': 'Número',
};

/** Processed option with fork reference resolved */
export interface ProcessedOption {
  value: string;
  /** Resolved fork section (if this option triggers a fork) */
  forkSection?: ProcessedSection;
  /** The SectionGuid of the fork this option triggers */
  forkSectionGuid?: string;
}

/** Processed field with full metadata */
export interface ProcessedField {
  fieldGuid: string;
  question: string;
  fieldType: FieldType;
  mandatory: boolean;
  multiple: boolean;
  options: ProcessedOption[];
  /** The section this field belongs to */
  sectionGuid: string;
  /** Full UID path for this field (includes fork chain if in a fork section) */
  uid: string;
  /** Depth in the fork tree (0 = root section) */
  forkDepth: number;
  /** Chain of section GUIDs from root to this field's section */
  sectionChain: string[];
}

/** Processed section with resolved fork relationships */
export interface ProcessedSection {
  sectionGuid: string;
  /** Parent section GUID (null for root sections) */
  parentSectionGuid: string | null;
  /** The field+option in the parent section that triggers this fork */
  triggeredBy?: {
    fieldGuid: string;
    optionValue: string;
  };
  fields: ProcessedField[];
  /** Fork sections that are children of fields in this section */
  childForks: ProcessedSection[];
  /** Whether this section is orphaned (has parent but no trigger) */
  isOrphaned: boolean;
  /** Whether this section has no fields */
  isEmpty: boolean;
  /** Depth in the fork tree (0 = root section) */
  depth: number;
}

/** Complete processed form structure */
export interface ProcessedForm {
  /** Root sections (no parent) in order */
  rootSections: ProcessedSection[];
  /** All sections indexed by SectionGuid */
  sectionMap: Map<string, ProcessedSection>;
  /** All fields indexed by their computed UID */
  fieldMap: Map<string, ProcessedField>;
  /** All fields in flat order (root first, forks nested) */
  allFields: ProcessedField[];
  /** Only mandatory fields */
  mandatoryFields: ProcessedField[];
  /** Orphaned sections (exist but not triggered by any option) */
  orphanedSections: ProcessedSection[];
  /** Statistics */
  stats: {
    totalSections: number;
    rootSections: number;
    forkSections: number;
    emptyForks: number;
    orphanedSections: number;
    totalFields: number;
    mandatoryFields: number;
    maxForkDepth: number;
  };
}

// ============================================================
// Form Submission Types
// ============================================================

/** Single field value in the submission format */
export interface FormFieldValue {
  uid: string;
  value: string;
}

/** Complete form submission */
export interface FormSubmission {
  formId: string;
  guardId: string;
  centerId: string;
  incidentFamily: string;
  incidentType: string;
  fields: FormFieldValue[];
  transcript?: string;
  completionPercentage: number;
  missingMandatoryFields: string[];
  submittedAt: string;
}
