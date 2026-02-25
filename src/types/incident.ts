// ============================================================
// Incident Types — Tracking submitted and in-progress incidents
// ============================================================

import { FormFieldValue } from './form';

export type IncidentStatus = 'in_progress' | 'completed' | 'submitted' | 'error';

/** An incident tracked through the system */
export interface Incident {
  /** Internal ID for this incident record */
  id: string;
  /** Form definition ID used */
  formId: string;
  /** Guard who reported */
  guardId: string;
  /** Security center */
  centerId: string;
  /** Top-level family (e.g. "Hurto") */
  incidentFamily: string;
  /** Specific type (e.g. "Hurto Genérico") */
  incidentType: string;
  /** Current status */
  status: IncidentStatus;
  /** Filled field values */
  fields: FormFieldValue[];
  /** Full conversation transcript (if available) */
  transcript?: string;
  /** Percentage of mandatory fields filled (0-100) */
  completionPercentage: number;
  /** UIDs of mandatory fields still missing */
  missingMandatoryFields: string[];
  /** HappyRobot conversation/session ID */
  happyRobotSessionId?: string;
  /** When the incident was created */
  createdAt: string;
  /** When the incident was last updated */
  updatedAt: string;
  /** When the form was submitted to Prosegur (if submitted) */
  submittedAt?: string;
  /** Error message if status is 'error' */
  errorMessage?: string;
}

/** Summary stats for the dashboard */
export interface IncidentStats {
  total: number;
  inProgress: number;
  completed: number;
  submitted: number;
  errors: number;
  averageCompletionPercentage: number;
}

/** Request to create a new incident (from webhook trigger) */
export interface CreateIncidentRequest {
  formId: string;
  guardId: string;
  centerId: string;
  incidentFamily: string;
  incidentType: string;
  happyRobotSessionId?: string;
}

/** Form ID to mock file mapping */
export const FORM_ID_MAP: Record<string, string> = {
  'hurto-generico': 'hurto-generico.json',
  'hurto-recuperacion': 'hurto-recuperacion.json',
  'hurto-centro-comercial': 'hurto-centro-comercial.json',
};

/** Human-readable form names */
export const FORM_NAMES: Record<string, string> = {
  'hurto-generico': 'Hurto Genérico',
  'hurto-recuperacion': 'Hurto con Recuperación',
  'hurto-centro-comercial': 'Hurto en Centro Comercial',
};
