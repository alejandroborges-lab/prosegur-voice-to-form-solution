import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique ID for incidents and other entities.
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Get current ISO timestamp.
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Safe JSON parse with fallback.
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}
