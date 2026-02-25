// ============================================================
// Form Loader — Loads form JSON files from mocks directory
// ============================================================

import { RawFormDefinition } from '@/types/form';
import { FORM_ID_MAP } from '@/types/incident';
import fs from 'fs';
import path from 'path';

const MOCKS_DIR = path.join(process.cwd(), 'src', 'mocks', 'forms');

/**
 * Load a raw form definition by form ID.
 */
export function loadFormDefinition(formId: string): RawFormDefinition | null {
  const filename = FORM_ID_MAP[formId];
  if (!filename) return null;

  const filePath = path.join(MOCKS_DIR, filename);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as RawFormDefinition;
}

/**
 * Get all available form IDs.
 */
export function getAvailableFormIds(): string[] {
  return Object.keys(FORM_ID_MAP);
}
