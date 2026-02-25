import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { FormFieldValue } from '@/types/form';

/**
 * POST /api/prosegur/forms/[formId]/submit
 * Mock Prosegur API: Receives filled form data and stores it.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;

  const body = await request.json() as {
    guard_id: string;
    center_id: string;
    incident_family: string;
    incident_type: string;
    fields: FormFieldValue[];
    transcript?: string;
  };

  // Create and immediately submit the incident
  const incident = store.createIncident({
    formId,
    guardId: body.guard_id,
    centerId: body.center_id,
    incidentFamily: body.incident_family,
    incidentType: body.incident_type,
  });

  store.updateIncidentFields(
    incident.id,
    body.fields,
    100, // Marked as complete when submitted directly
    [],
    body.transcript
  );

  store.submitIncident(incident.id);

  return NextResponse.json({
    success: true,
    incidentId: incident.id,
    message: `Incident submitted successfully for form ${formId}`,
    fieldsReceived: body.fields.length,
  });
}
