// ============================================================
// In-memory store for demo purposes
// Stores incidents and session data (not persisted across restarts)
// ============================================================

import { Incident, IncidentStats } from '@/types/incident';
import { FormFieldValue } from '@/types/form';
import { generateId, now } from './utils';

class InMemoryStore {
  private incidents: Map<string, Incident> = new Map();

  /**
   * Create a new incident record.
   */
  createIncident(params: {
    formId: string;
    guardId: string;
    centerId: string;
    incidentFamily: string;
    incidentType: string;
    happyRobotSessionId?: string;
  }): Incident {
    const id = generateId();
    const incident: Incident = {
      id,
      formId: params.formId,
      guardId: params.guardId,
      centerId: params.centerId,
      incidentFamily: params.incidentFamily,
      incidentType: params.incidentType,
      status: 'in_progress',
      fields: [],
      completionPercentage: 0,
      missingMandatoryFields: [],
      happyRobotSessionId: params.happyRobotSessionId,
      createdAt: now(),
      updatedAt: now(),
    };
    this.incidents.set(id, incident);
    return incident;
  }

  /**
   * Get an incident by ID.
   */
  getIncident(id: string): Incident | undefined {
    return this.incidents.get(id);
  }

  /**
   * Find incident by HappyRobot session ID.
   */
  findBySessionId(sessionId: string): Incident | undefined {
    for (const incident of this.incidents.values()) {
      if (incident.happyRobotSessionId === sessionId) return incident;
    }
    return undefined;
  }

  /**
   * Update an incident with field values from the AI.
   */
  updateIncidentFields(
    id: string,
    fields: FormFieldValue[],
    completionPercentage: number,
    missingMandatoryFields: string[],
    transcript?: string
  ): Incident | undefined {
    const incident = this.incidents.get(id);
    if (!incident) return undefined;

    incident.fields = fields;
    incident.completionPercentage = completionPercentage;
    incident.missingMandatoryFields = missingMandatoryFields;
    if (transcript) incident.transcript = transcript;
    incident.status = completionPercentage === 100 ? 'completed' : 'in_progress';
    incident.updatedAt = now();

    return incident;
  }

  /**
   * Mark an incident as submitted.
   */
  submitIncident(id: string): Incident | undefined {
    const incident = this.incidents.get(id);
    if (!incident) return undefined;

    incident.status = 'submitted';
    incident.submittedAt = now();
    incident.updatedAt = now();

    return incident;
  }

  /**
   * Mark an incident as errored.
   */
  errorIncident(id: string, errorMessage: string): Incident | undefined {
    const incident = this.incidents.get(id);
    if (!incident) return undefined;

    incident.status = 'error';
    incident.errorMessage = errorMessage;
    incident.updatedAt = now();

    return incident;
  }

  /**
   * Get all incidents, optionally filtered.
   */
  listIncidents(filter?: {
    status?: Incident['status'];
    formId?: string;
  }): Incident[] {
    let results = Array.from(this.incidents.values());

    if (filter?.status) {
      results = results.filter((i) => i.status === filter.status);
    }
    if (filter?.formId) {
      results = results.filter((i) => i.formId === filter.formId);
    }

    // Sort by createdAt descending (newest first)
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return results;
  }

  /**
   * Get summary statistics.
   */
  getStats(): IncidentStats {
    const all = Array.from(this.incidents.values());
    const totalCompletion = all.reduce((sum, i) => sum + i.completionPercentage, 0);

    return {
      total: all.length,
      inProgress: all.filter((i) => i.status === 'in_progress').length,
      completed: all.filter((i) => i.status === 'completed').length,
      submitted: all.filter((i) => i.status === 'submitted').length,
      errors: all.filter((i) => i.status === 'error').length,
      averageCompletionPercentage: all.length > 0 ? Math.round(totalCompletion / all.length) : 0,
    };
  }

  /**
   * Clear all data (for testing).
   */
  clear(): void {
    this.incidents.clear();
  }
}

// Singleton instance
export const store = new InMemoryStore();
