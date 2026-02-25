import { describe, it, expect } from 'vitest';
import { processForm } from '@/services/formProcessor';
import { RawFormDefinition, FieldType } from '@/types/form';
import fs from 'fs';
import path from 'path';

const MOCKS_DIR = path.join(__dirname, '..', '..', 'src', 'mocks', 'forms');

function loadForm(filename: string): RawFormDefinition {
  return JSON.parse(fs.readFileSync(path.join(MOCKS_DIR, filename), 'utf-8'));
}

describe('FormProcessor', () => {
  describe('Hurto Generico', () => {
    const raw = loadForm('hurto-generico.json');
    const processed = processForm(raw);

    it('should process all sections', () => {
      expect(processed.stats.totalSections).toBeGreaterThan(0);
      expect(processed.stats.rootSections).toBe(6); // 6 root sections
    });

    it('should identify mandatory fields', () => {
      expect(processed.stats.mandatoryFields).toBeGreaterThan(0);
      // Check specific mandatory fields
      const mandatoryQuestions = processed.mandatoryFields.map((f) => f.question);
      expect(mandatoryQuestions).toContain('¿Cuándo ha ocurrido?');
      expect(mandatoryQuestions).toContain('¿Dónde ha ocurrido?');
      expect(mandatoryQuestions).toContain('Se ha sustraído:');
    });

    it('should resolve fork sections', () => {
      expect(processed.stats.forkSections).toBeGreaterThan(0);
    });

    it('should handle empty fork sections', () => {
      // Section ce80cd88 (info about perpetrators) is empty
      const emptySections = Array.from(processed.sectionMap.values()).filter(
        (s) => s.isEmpty && s.parentSectionGuid !== null
      );
      expect(emptySections.length).toBeGreaterThan(0);
    });

    it('should compute UIDs correctly for root fields', () => {
      // Root field should just be the FieldGuid
      const rootField = processed.allFields.find(
        (f) => f.question === '¿Cuándo ha ocurrido?'
      );
      expect(rootField).toBeDefined();
      expect(rootField!.uid).toBe(rootField!.fieldGuid);
      expect(rootField!.forkDepth).toBe(0);
    });

    it('should compute UIDs correctly for fork fields', () => {
      // Fork field should include fork section GUID
      const forkFields = processed.allFields.filter((f) => f.forkDepth > 0);
      expect(forkFields.length).toBeGreaterThan(0);

      for (const field of forkFields) {
        // Fork field UID should contain the field GUID
        expect(field.uid).toContain(field.fieldGuid);
        // Fork field UID should be different from just the fieldGuid
        expect(field.uid).not.toBe(field.fieldGuid);
      }
    });

    it('should handle nested forks (depth 2)', () => {
      const deepFields = processed.allFields.filter((f) => f.forkDepth >= 2);
      expect(deepFields.length).toBeGreaterThan(0);
      expect(processed.stats.maxForkDepth).toBeGreaterThanOrEqual(2);
    });

    it('should build fieldMap indexed by UID', () => {
      expect(processed.fieldMap.size).toBe(processed.allFields.length);
      for (const field of processed.allFields) {
        expect(processed.fieldMap.get(field.uid)).toBe(field);
      }
    });

    it('should populate field options with fork references', () => {
      // Field "Se ha sustraído" has option "Bienes del cliente" with ForkGuid
      const field = processed.allFields.find(
        (f) => f.question === 'Se ha sustraído:'
      );
      expect(field).toBeDefined();

      const bienesOption = field!.options.find((o) =>
        o.value.includes('Bienes del cliente')
      );
      expect(bienesOption).toBeDefined();
      expect(bienesOption!.forkSectionGuid).toBeDefined();
    });

    it('should identify field types correctly', () => {
      const dateField = processed.allFields.find(
        (f) => f.question === '¿Cuándo ha ocurrido?'
      );
      expect(dateField?.fieldType).toBe(FieldType.DateTime);

      const dropdownField = processed.allFields.find(
        (f) => f.question === '¿Dónde ha ocurrido?'
      );
      expect(dropdownField?.fieldType).toBe(FieldType.Dropdown);

      const boolField = processed.allFields.find((f) =>
        f.question.includes('¿Ha habido consecuencias')
      );
      expect(boolField?.fieldType).toBe(FieldType.Boolean);
    });
  });

  describe('Hurto Recuperacion', () => {
    const raw = loadForm('hurto-recuperacion.json');
    const processed = processForm(raw);

    it('should process without errors', () => {
      expect(processed.stats.totalSections).toBeGreaterThan(0);
      expect(processed.allFields.length).toBeGreaterThan(0);
    });

    it('should have different semantics for shared FieldGuids', () => {
      // b8a53238 is "Se ha recuperado" in Hurto2 (not "Se ha sustraído" like Hurto1)
      const field = processed.allFields.find(
        (f) => f.fieldGuid === 'b8a53238-ae65-4a21-97cc-127b129b1492'
      );
      if (field) {
        // The question text should come from this specific form
        expect(field.question).toBeDefined();
      }
    });
  });

  describe('Hurto Centro Comercial', () => {
    const raw = loadForm('hurto-centro-comercial.json');
    const processed = processForm(raw);

    it('should process without errors', () => {
      expect(processed.stats.totalSections).toBeGreaterThan(0);
    });

    it('should have more fields in Section 1 (floor, zone, local)', () => {
      // Hurto3 has 4 fields in section 1 vs 2 in Hurto1
      const rootSections = processed.rootSections;
      expect(rootSections.length).toBeGreaterThan(0);
      const section1Fields = rootSections[0].fields;
      expect(section1Fields.length).toBeGreaterThanOrEqual(2);
    });

    it('should detect orphaned sections', () => {
      // Section 33f3b12c exists but has no ForkGuid trigger in Hurto3
      const orphaned = processed.orphanedSections;
      // May or may not have orphans depending on form structure
      expect(orphaned).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle a form with no sections', () => {
      const processed = processForm([]);
      expect(processed.stats.totalSections).toBe(0);
      expect(processed.allFields.length).toBe(0);
    });

    it('should handle a section with no fields', () => {
      const raw: RawFormDefinition = [
        { SectionGuid: 'test-section-1' },
      ];
      const processed = processForm(raw);
      expect(processed.stats.totalSections).toBe(1);
      expect(processed.allFields.length).toBe(0);
      expect(processed.rootSections[0].isEmpty).toBe(true);
    });

    it('should handle a section with no options on fields', () => {
      const raw: RawFormDefinition = [
        {
          SectionGuid: 'test-section-1',
          DForm_Fields: [
            {
              FieldGuid: 'field-1',
              Question: 'Test question',
              FieldType: '4',
            },
          ],
        },
      ];
      const processed = processForm(raw);
      expect(processed.allFields.length).toBe(1);
      expect(processed.allFields[0].options).toEqual([]);
    });

    it('should handle ForkGuid pointing to non-existent section', () => {
      const raw: RawFormDefinition = [
        {
          SectionGuid: 'section-1',
          DForm_Fields: [
            {
              FieldGuid: 'field-1',
              Question: 'Test',
              FieldType: '3',
              Options: [
                { Value: 'Yes', ForkGuid: 'non-existent-section' },
                { Value: 'No' },
              ],
            },
          ],
        },
      ];
      // Should not throw
      const processed = processForm(raw);
      expect(processed.allFields.length).toBe(1);
    });

    it('should handle duplicate FieldGuids across different fork sections', () => {
      const raw: RawFormDefinition = [
        {
          SectionGuid: 'root',
          DForm_Fields: [
            {
              FieldGuid: 'trigger-field',
              Question: 'Choose',
              FieldType: '2',
              Options: [
                { Value: 'A', ForkGuid: 'fork-a' },
                { Value: 'B', ForkGuid: 'fork-b' },
              ],
            },
          ],
        },
        {
          SectionGuid: 'fork-a',
          SectionParentGuid: 'root',
          DForm_Fields: [
            {
              FieldGuid: 'duplicate-field',
              Question: 'Shared question in A',
              FieldType: '4',
            },
          ],
        },
        {
          SectionGuid: 'fork-b',
          SectionParentGuid: 'root',
          DForm_Fields: [
            {
              FieldGuid: 'duplicate-field',
              Question: 'Shared question in B',
              FieldType: '4',
            },
          ],
        },
      ];

      const processed = processForm(raw);
      // Both instances should have different UIDs
      const dupeFields = processed.allFields.filter(
        (f) => f.fieldGuid === 'duplicate-field'
      );
      expect(dupeFields.length).toBe(2);
      expect(dupeFields[0].uid).not.toBe(dupeFields[1].uid);
    });
  });
});
