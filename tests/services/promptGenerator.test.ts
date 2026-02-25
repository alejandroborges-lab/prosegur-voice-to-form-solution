import { describe, it, expect } from 'vitest';
import { processForm } from '@/services/formProcessor';
import { generatePrompt } from '@/services/promptGenerator';
import { RawFormDefinition } from '@/types/form';
import fs from 'fs';
import path from 'path';

const MOCKS_DIR = path.join(__dirname, '..', '..', 'src', 'mocks', 'forms');

function loadForm(filename: string): RawFormDefinition {
  return JSON.parse(fs.readFileSync(path.join(MOCKS_DIR, filename), 'utf-8'));
}

describe('PromptGenerator', () => {
  it('should generate a prompt for Hurto Generico', () => {
    const raw = loadForm('hurto-generico.json');
    const processed = processForm(raw);
    const result = generatePrompt(processed, 'Hurto Generico', 'Hurto');

    expect(result.agentPrompt).toContain('Hurto Generico');
    expect(result.agentPrompt).toContain('OBLIGATORIO');
    expect(result.agentPrompt).toContain('¿Cuándo ha ocurrido?');
    expect(result.agentPrompt).toContain('¿Dónde ha ocurrido?');
  });

  it('should include bifurcation rules', () => {
    const raw = loadForm('hurto-generico.json');
    const processed = processForm(raw);
    const result = generatePrompt(processed, 'Hurto Generico', 'Hurto');

    expect(result.agentPrompt).toContain('Reglas de Bifurcación');
  });

  it('should include implicit mapping rules', () => {
    const raw = loadForm('hurto-generico.json');
    const processed = processForm(raw);
    const result = generatePrompt(processed, 'Hurto Generico', 'Hurto');

    expect(result.agentPrompt).toContain('policía');
    expect(result.agentPrompt).toContain('detenido');
    expect(result.agentPrompt).toContain('CCTV');
  });

  it('should generate initial message', () => {
    const raw = loadForm('hurto-generico.json');
    const processed = processForm(raw);
    const result = generatePrompt(processed, 'Hurto Generico', 'Hurto');

    expect(result.initialMessage).toContain('Hurto Generico');
    expect(result.initialMessage).toContain('Cuéntame');
  });

  it('should generate extraction schema', () => {
    const raw = loadForm('hurto-generico.json');
    const processed = processForm(raw);
    const result = generatePrompt(processed, 'Hurto Generico', 'Hurto');

    expect(result.extractionSchema.length).toBeGreaterThan(0);
    // Each field should have uid, key, question, type
    for (const field of result.extractionSchema) {
      expect(field.uid).toBeDefined();
      expect(field.key).toBeDefined();
      expect(field.question).toBeDefined();
      expect(field.type).toBeDefined();
    }
  });

  it('should include UIDs in field descriptions', () => {
    const raw = loadForm('hurto-generico.json');
    const processed = processForm(raw);
    const result = generatePrompt(processed, 'Hurto Generico', 'Hurto');

    // Check that UIDs are present in the prompt
    expect(result.agentPrompt).toContain('UID:');
  });

  it('should work for all three form types', () => {
    const forms = ['hurto-generico.json', 'hurto-recuperacion.json', 'hurto-centro-comercial.json'];

    for (const filename of forms) {
      const raw = loadForm(filename);
      const processed = processForm(raw);
      const result = generatePrompt(processed, filename, 'Hurto');

      expect(result.agentPrompt.length).toBeGreaterThan(100);
      expect(result.extractionSchema.length).toBeGreaterThan(0);
      expect(result.initialMessage).toBeDefined();
    }
  });
});
