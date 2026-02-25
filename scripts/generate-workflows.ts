/**
 * Script to generate HappyRobot workflow JSON files for all form types.
 * Run with: npx tsx scripts/generate-workflows.ts
 */

import fs from 'fs';
import path from 'path';
import { processForm } from '../src/services/formProcessor';
import { generatePrompt } from '../src/services/promptGenerator';
import { generateWorkflow } from '../src/services/workflowGenerator';
import { RawFormDefinition } from '../src/types/form';

const FORMS = [
  {
    id: 'hurto-generico',
    file: 'hurto-generico.json',
    name: 'Hurto Generico',
    family: 'Hurto',
  },
  {
    id: 'hurto-recuperacion',
    file: 'hurto-recuperacion.json',
    name: 'Hurto con Recuperacion',
    family: 'Hurto',
  },
  {
    id: 'hurto-centro-comercial',
    file: 'hurto-centro-comercial.json',
    name: 'Hurto en Centro Comercial',
    family: 'Hurto',
  },
];

const MOCKS_DIR = path.join(__dirname, '..', 'src', 'mocks', 'forms');
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'generated');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

for (const form of FORMS) {
  console.log(`\nProcessing: ${form.name} (${form.id})`);

  // Load raw form
  const rawPath = path.join(MOCKS_DIR, form.file);
  const rawJson = fs.readFileSync(rawPath, 'utf-8');
  const rawForm: RawFormDefinition = JSON.parse(rawJson);

  // Process form
  const processed = processForm(rawForm);
  console.log(`  Sections: ${processed.stats.totalSections} (${processed.stats.rootSections} root, ${processed.stats.forkSections} fork)`);
  console.log(`  Fields: ${processed.stats.totalFields} (${processed.stats.mandatoryFields} mandatory)`);
  console.log(`  Max fork depth: ${processed.stats.maxForkDepth}`);
  console.log(`  Orphaned sections: ${processed.stats.orphanedSections}`);

  // Generate prompt
  const prompt = generatePrompt(processed, form.name, form.family);
  console.log(`  Prompt length: ${prompt.agentPrompt.length} chars`);
  console.log(`  Extraction fields: ${prompt.extractionSchema.length}`);

  // Generate workflow
  const workflow = generateWorkflow(processed, prompt, {
    backendUrl,
    formId: form.id,
    incidentType: form.name,
    incidentFamily: form.family,
  });
  console.log(`  Workflow nodes: ${workflow.nodes.length}`);

  // Write output
  const outputPath = path.join(OUTPUT_DIR, `workflow-${form.id}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2));
  console.log(`  Written: ${outputPath}`);

  // Also write the prompt as a separate file for review
  const promptPath = path.join(OUTPUT_DIR, `prompt-${form.id}.md`);
  fs.writeFileSync(promptPath, prompt.agentPrompt);
  console.log(`  Prompt: ${promptPath}`);
}

console.log('\nDone! All workflows generated.');
