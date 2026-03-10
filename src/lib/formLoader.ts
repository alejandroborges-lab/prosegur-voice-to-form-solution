// ============================================================
// Form Loader — Fetches form definitions from Prosegur API
// ============================================================

import { RawFormDefinition } from '@/types/form';

const PROSEGUR_API_BASE = 'https://pops-emea.prosegur.com/Forms_API/rest/MCP_IA/GetForm';

/**
 * Load a raw form definition by numeric form ID from the Prosegur API.
 */
export async function loadFormDefinition(formId: string): Promise<RawFormDefinition | null> {
  const url = `${PROSEGUR_API_BASE}?DFormId=${formId}&ISO=ES`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json() as Promise<RawFormDefinition>;
}
