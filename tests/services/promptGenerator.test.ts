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

describe('PromptGenerator — generic mode (default)', () => {
  it('should generate a form-agnostic prompt', () => {
    const raw = loadForm('hurto-generico.json');
    const processed = processForm(raw);
    const result = generatePrompt(processed, 'Hurto Generico', 'Hurto');

    expect(result.agentPrompt).toContain('consultar_estado_formulario');
    expect(result.agentPrompt).toContain('Bifurcaciones');
    expect(result.agentPrompt).toContain('actualizar_formulario');
    expect(result.agentPrompt).toContain('finalizar_formulario');
    // Generic prompt should NOT contain form-specific UIDs
    expect(result.agentPrompt).not.toContain('98938461-d206-4397-8cfc-552f43f94e0a');
  });

  it('should return empty extraction schema in generic mode', () => {
    const raw = loadForm('hurto-generico.json');
    const processed = processForm(raw);
    const result = generatePrompt(processed, 'Hurto Generico', 'Hurto');

    expect(result.extractionSchema).toEqual([]);
  });

  it('should include bifurcation instructions', () => {
    const raw = loadForm('hurto-generico.json');
    const processed = processForm(raw);
    const result = generatePrompt(processed, 'Hurto Generico', 'Hurto');

    expect(result.agentPrompt).toContain('condition');
    expect(result.agentPrompt).toContain('opens');
    expect(result.agentPrompt).toContain('bifurcación inactiva');
  });

  it('should include implicit mapping hints', () => {
    const raw = loadForm('hurto-generico.json');
    const processed = processForm(raw);
    const result = generatePrompt(processed, 'Hurto Generico', 'Hurto');

    expect(result.agentPrompt).toContain('policía');
    expect(result.agentPrompt).toContain('detenido');
    expect(result.agentPrompt).toContain('CCTV');
  });
});

describe('PromptGenerator — specific mode (legacy)', () => {
  it('should generate a form-specific prompt with UIDs', () => {
    const raw = loadForm('hurto-generico.json');
    const processed = processForm(raw);
    const result = generatePrompt(processed, 'Hurto Generico', 'Hurto', 'specific');

    expect(result.agentPrompt).toContain('Hurto Generico');
    expect(result.agentPrompt).toContain('OBLIGATORIO');
    expect(result.agentPrompt).toContain('¿Cuándo ha ocurrido?');
    expect(result.agentPrompt).toContain('UID:');
  });

  it('should include bifurcation rules', () => {
    const raw = loadForm('hurto-generico.json');
    const processed = processForm(raw);
    const result = generatePrompt(processed, 'Hurto Generico', 'Hurto', 'specific');

    expect(result.agentPrompt).toContain('Reglas de Bifurcación');
  });

  it('should generate initial message with form name', () => {
    const raw = loadForm('hurto-generico.json');
    const processed = processForm(raw);
    const result = generatePrompt(processed, 'Hurto Generico', 'Hurto', 'specific');

    expect(result.initialMessage).toContain('Hurto Generico');
    expect(result.initialMessage).toContain('Cuéntame');
  });

  it('should generate extraction schema', () => {
    const raw = loadForm('hurto-generico.json');
    const processed = processForm(raw);
    const result = generatePrompt(processed, 'Hurto Generico', 'Hurto', 'specific');

    expect(result.extractionSchema.length).toBeGreaterThan(0);
    for (const field of result.extractionSchema) {
      expect(field.uid).toBeDefined();
      expect(field.key).toBeDefined();
      expect(field.question).toBeDefined();
      expect(field.type).toBeDefined();
    }
  });

  it('should work for all three form types', () => {
    const forms = ['hurto-generico.json', 'hurto-recuperacion.json', 'hurto-centro-comercial.json'];

    for (const filename of forms) {
      const raw = loadForm(filename);
      const processed = processForm(raw);
      const result = generatePrompt(processed, filename, 'Hurto', 'specific');

      expect(result.agentPrompt.length).toBeGreaterThan(100);
      expect(result.extractionSchema.length).toBeGreaterThan(0);
      expect(result.initialMessage).toBeDefined();
    }
  });
});
