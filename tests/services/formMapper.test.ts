import { describe, it, expect } from 'vitest';
import { processForm } from '@/services/formProcessor';
import { FormMapper } from '@/services/formMapper';
import { RawFormDefinition } from '@/types/form';
import fs from 'fs';
import path from 'path';

const MOCKS_DIR = path.join(__dirname, '..', '..', 'src', 'mocks', 'forms');

function loadForm(filename: string): RawFormDefinition {
  return JSON.parse(fs.readFileSync(path.join(MOCKS_DIR, filename), 'utf-8'));
}

describe('FormMapper', () => {
  describe('Hurto Generico', () => {
    const raw = loadForm('hurto-generico.json');
    const processed = processForm(raw);

    it('should map extracted data by UID', () => {
      const mapper = new FormMapper(processed);

      // Find the UID for "¿Cuándo ha ocurrido?"
      const whenField = processed.allFields.find(
        (f) => f.question === '¿Cuándo ha ocurrido?'
      )!;
      const whereField = processed.allFields.find(
        (f) => f.question === '¿Dónde ha ocurrido?'
      )!;

      const result = mapper.mapExtractedData({
        [whenField.uid]: '2026-02-25T15:30:00',
        [whereField.uid]: 'Aparcamiento',
      });

      expect(result.fields.length).toBe(2);
      expect(result.fields.find((f) => f.uid === whenField.uid)?.value).toBe(
        '2026-02-25T15:30:00'
      );
      expect(result.fields.find((f) => f.uid === whereField.uid)?.value).toBe(
        'Aparcamiento'
      );
    });

    it('should handle fuzzy option matching', () => {
      const mapper = new FormMapper(processed);
      const whereField = processed.allFields.find(
        (f) => f.question === '¿Dónde ha ocurrido?'
      )!;

      const result = mapper.mapExtractedData({
        [whereField.uid]: 'aparcamiento', // lowercase
      });

      expect(result.fields.length).toBe(1);
      expect(result.fields[0].value).toBe('Aparcamiento'); // matched to exact option
    });

    it('should report missing mandatory fields', () => {
      const mapper = new FormMapper(processed);

      // Submit with no data
      const result = mapper.mapExtractedData({});

      expect(result.missingMandatory.length).toBeGreaterThan(0);
      expect(result.completionPercentage).toBe(0);
    });

    it('should report warnings for unmatched values', () => {
      const mapper = new FormMapper(processed);
      const whereField = processed.allFields.find(
        (f) => f.question === '¿Dónde ha ocurrido?'
      )!;

      const result = mapper.mapExtractedData({
        [whereField.uid]: 'Lugar inexistente',
      });

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toContain('no coincide');
    });

    it('should handle boolean field shortcuts', () => {
      const mapper = new FormMapper(processed);
      const boolField = processed.allFields.find((f) =>
        f.question.includes('¿Ha habido consecuencias')
      )!;

      // Map using the UID with 'No' value
      const result = mapper.mapExtractedData({
        [boolField.uid]: 'No',
      });

      expect(result.fields.length).toBe(1);
      expect(result.fields[0].value).toBe('No');
    });

    it('should handle multi-select fields', () => {
      const mapper = new FormMapper(processed);
      const multiField = processed.allFields.find(
        (f) => f.question === 'Se ha visto afectado:'
      )!;

      const result = mapper.mapExtractedData({
        [multiField.uid]: 'El Cliente | Personal de Prosegur',
      });

      expect(result.fields.length).toBe(1);
      expect(result.fields[0].value).toContain('El Cliente');
      expect(result.fields[0].value).toContain('Personal de Prosegur');
    });

    it('should handle null and empty values gracefully', () => {
      const mapper = new FormMapper(processed);
      const whenField = processed.allFields.find(
        (f) => f.question === '¿Cuándo ha ocurrido?'
      )!;

      const result = mapper.mapExtractedData({
        [whenField.uid]: null,
        'nonexistent': '',
        'another': '   ',
      });

      // No fields should be mapped
      expect(result.fields.length).toBe(0);
    });

    it('should extract numbers from text', () => {
      const mapper = new FormMapper(processed);
      const numField = processed.allFields.find((f) =>
        f.question.includes('Importe')
      )!;

      const result = mapper.mapExtractedData({
        [numField.uid]: '50',
      });

      expect(result.fields.length).toBe(1);
      expect(result.fields[0].value).toBe('50');
    });
  });

  describe('Fork activation', () => {
    const raw = loadForm('hurto-generico.json');
    const processed = processForm(raw);

    it('should only include fork fields when parent option is active', () => {
      const mapper = new FormMapper(processed);

      // Find the consequences field and its fork fields
      const consequencesField = processed.allFields.find((f) =>
        f.question.includes('¿Ha habido consecuencias')
      )!;

      // Answer "No" — fork fields should NOT be active
      const resultNo = mapper.mapExtractedData({
        [consequencesField.uid]: 'No',
      });

      // Fork fields should not appear in missing mandatory since fork is not active
      const forkMandatory = resultNo.missingMandatory.filter(
        (f) => processed.allFields.find((af) => af.uid === f.uid)?.forkDepth! > 0
      );
      // When consequences = No, consequence-related fork fields should not be mandatory
      // This verifies fork resolution is working
      expect(forkMandatory.every((f) => {
        const fullField = processed.allFields.find((af) => af.uid === f.uid);
        // Should not include fields from the consequences fork
        return fullField?.sectionGuid !== '2e587f4f-f137-4842-85e2-cffcd8698d7b';
      })).toBe(true);
    });
  });
});
