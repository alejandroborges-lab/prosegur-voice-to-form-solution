// ============================================================
// WorkflowGenerator — Generates HappyRobot-compatible workflow
// JSON files that can be imported into the platform
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { ProcessedForm, ProcessedField, FieldType } from '@/types/form';
import { GeneratedPrompt } from './promptGenerator';

// -----------------------------------------------------------
// Types
// -----------------------------------------------------------

interface WorkflowNode {
  id: string;
  persistent_id: string;
  slug: string;
  org_id: string;
  use_case_id: string;
  parent_id: string | null;
  version_id: string;
  type: 'action' | 'prompt' | 'tool';
  name: string;
  is_complete: boolean;
  node_output_id: string | null;
  sort_index: number;
  timestamp: string;
  is_deleted: boolean;
  configuration: Record<string, unknown>;
  staging_configuration: Record<string, unknown>;
  development_configuration: Record<string, unknown>;
  retry_configuration: Record<string, unknown>;
  outbound_retry_configuration: Record<string, unknown>;
  node_component_id: string | null;
  node_component_input_mapping: unknown[];
  node_output: unknown | null;
  // Prompt-specific
  prompt?: PromptBlock[];
  prompt_md?: string;
  // Tool-specific
  function?: ToolFunction;
  // Trigger-specific
  integration_id?: string;
  event_id?: string;
  trigger_interval?: unknown;
  multi_event_behavior?: string;
  hidden_fields?: unknown[];
  integration?: unknown;
  event?: unknown;
}

interface PromptBlock {
  type: string;
  children: PromptChild[];
  index_node_id: string;
  index_node_hash: string;
  indent?: number;
  listStyleType?: string;
}

interface PromptChild {
  text: string;
  bold?: boolean;
  code?: boolean;
  type?: string;
  group_id?: string;
  variable_id?: string;
  children?: PromptChild[];
}

interface ToolFunction {
  description: ToolTextBlock[];
  message: {
    type: 'none' | 'ai';
    description: ToolTextBlock[];
    example: string;
  };
  parameters: ToolParameter[];
  tool_index_id: string;
  tool_index_hash: string;
}

interface ToolTextBlock {
  type: 'paragraph';
  children: { text: string }[];
}

interface ToolParameter {
  name: string;
  example: string;
  description: ToolTextBlock[];
}

interface WorkflowExport {
  version: {
    id: string;
    slug: string;
    org_id: string;
    use_case_id: string;
    version_number: number;
    name: string;
    is_published: boolean;
    is_live: boolean;
    source_version_id: string | null;
    timestamp: string;
    published_at: string | null;
    is_deleted: boolean;
    description: string;
    environment: string;
    created_by: string | null;
    created_by_api_key: string | null;
    created_by_entity: string;
  };
  nodes: WorkflowNode[];
  edges: unknown[];
  workflowVersion: number;
}

// -----------------------------------------------------------
// Generator
// -----------------------------------------------------------

export interface WorkflowGeneratorOptions {
  /** Backend base URL for webhook endpoints */
  backendUrl: string;
  /** Organization ID in HappyRobot */
  orgId?: string;
  /** Use case ID in HappyRobot */
  useCaseId?: string;
  /** Form ID (e.g. "hurto-generico") */
  formId: string;
  /** Incident type name for display */
  incidentType: string;
  /** Incident family name */
  incidentFamily: string;
}

export class WorkflowGenerator {
  private options: Required<WorkflowGeneratorOptions>;
  private versionId: string;
  private timestamp: string;

  constructor(options: WorkflowGeneratorOptions) {
    this.options = {
      orgId: options.orgId || 'PLACEHOLDER_ORG_ID',
      useCaseId: options.useCaseId || uuidv4(),
      ...options,
    };
    this.versionId = uuidv4();
    this.timestamp = new Date().toISOString();
  }

  /**
   * Generate a complete HappyRobot workflow JSON.
   */
  generate(form: ProcessedForm, prompt: GeneratedPrompt): WorkflowExport {
    const nodes: WorkflowNode[] = [];

    // Node 1: Webhook Trigger
    const triggerNode = this.createTriggerNode();
    nodes.push(triggerNode);

    // Node 2: Chatbot Agent (child of trigger)
    const agentNode = this.createAgentNode(triggerNode.id);
    nodes.push(agentNode);

    // Node 3: Prompt (child of agent, sort -1)
    const promptNode = this.createPromptNode(agentNode.id, prompt);
    nodes.push(promptNode);

    // Node 4: Tool "consultar_estado_formulario" (child of prompt)
    const statusTool = this.createStatusTool(promptNode.id, form);
    nodes.push(statusTool);

    // Node 5: Tool "finalizar_formulario" (child of prompt)
    const submitTool = this.createSubmitTool(promptNode.id, form, prompt);
    nodes.push(submitTool);

    // Node 6: Post-conversation AI Extract (child of agent, sort 0)
    const extractNode = this.createExtractNode(agentNode.id, form, prompt);
    nodes.push(extractNode);

    // Node 7: Submit webhook (child of extract)
    const submitWebhook = this.createSubmitWebhookNode(extractNode.id);
    nodes.push(submitWebhook);

    return {
      version: {
        id: this.versionId,
        slug: this.generateSlug(),
        org_id: this.options.orgId,
        use_case_id: this.options.useCaseId,
        version_number: 1,
        name: 'Version 1',
        is_published: false,
        is_live: false,
        source_version_id: null,
        timestamp: this.timestamp,
        published_at: null,
        is_deleted: false,
        description: `Workflow para formulario de incidencia: ${this.options.incidentType}`,
        environment: 'production',
        created_by: null,
        created_by_api_key: null,
        created_by_entity: 'api',
      },
      nodes,
      edges: [],
      workflowVersion: 2,
    };
  }

  // -----------------------------------------------------------
  // Node Creators
  // -----------------------------------------------------------

  private createTriggerNode(): WorkflowNode {
    const id = uuidv4();
    const persistentId = uuidv4();

    return {
      id,
      persistent_id: persistentId,
      slug: this.generateSlug(),
      org_id: this.options.orgId,
      use_case_id: this.options.useCaseId,
      parent_id: null,
      version_id: this.versionId,
      type: 'action',
      name: 'Incidencia Trigger',
      is_complete: true,
      node_output_id: null,
      sort_index: 0,
      timestamp: this.timestamp,
      is_deleted: false,
      configuration: {
        auth_type: 'api_key',
      },
      staging_configuration: {},
      development_configuration: {},
      retry_configuration: {},
      outbound_retry_configuration: {},
      node_component_id: null,
      node_component_input_mapping: [],
      node_output: {
        id: uuidv4(),
        run_id: null,
        node_id: persistentId,
        node_persistent_id: persistentId,
        event_id: '01929b66-a335-7514-a159-cae2fe715286',
        session_id: null,
        chat_session_id: null,
        name: 'Incidencia Trigger',
        data: {
          data: {
            form_id: this.options.formId,
            guard_id: 'GUARD_001',
            center_id: 'CENTER_001',
            incident_family: this.options.incidentFamily,
            incident_type: this.options.incidentType,
          },
          query: {},
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        flat_data: {},
        is_multiple: false,
        error: null,
        status: null,
        scope: '',
        data_deleted: false,
        timestamp: this.timestamp,
      },
      integration_id: '01926a93-064a-7a00-81b2-8ab78d5907e0',
      event_id: '01929b66-a335-7514-a159-cae2fe715286',
      trigger_interval: null,
      multi_event_behavior: 'parallel',
      hidden_fields: [],
      integration: {
        id: '01926a93-064a-7a00-81b2-8ab78d5907e0',
        name: 'Webhook',
        group: 'built-in',
        icon: '/integrations/webhook.svg',
        description: 'Connect your agents to external systems via REST APIs',
        requires_credentials: false,
        agent_specific: false,
      },
      event: {
        id: '01929b66-a335-7514-a159-cae2fe715286',
        name: 'Incoming hook',
        integration_id: '01926a93-064a-7a00-81b2-8ab78d5907e0',
        type: 0,
        description: 'Listen to a new GET, POST or PUT request.',
        is_instant: true,
        has_cron_trigger: false,
        timeout_seconds: 10,
        retry_policy: {
          InitialInterval: 0,
          MaximumAttempts: 2,
          BackoffCoefficient: 2,
        },
      },
    };
  }

  private createAgentNode(triggerNodeId: string): WorkflowNode {
    return {
      id: uuidv4(),
      persistent_id: uuidv4(),
      slug: this.generateSlug(),
      org_id: this.options.orgId,
      use_case_id: this.options.useCaseId,
      parent_id: triggerNodeId,
      version_id: this.versionId,
      type: 'action',
      name: `Agente Incidencia - ${this.options.incidentType}`,
      is_complete: false,
      node_output_id: null,
      sort_index: 0,
      timestamp: this.timestamp,
      is_deleted: false,
      configuration: {
        channel: 'chatbot',
        agent: {
          languages: [
            {
              type: 'static',
              static: { id: 'es', name: 'Spanish' },
            },
          ],
          model: {
            type: 'static',
            static: { id: 'claude-sonnet-4-5-20250514', name: 'Claude Sonnet 4.5' },
          },
        },
        media_processing: {
          transcription: {
            enabled: true,
          },
        },
        idle_timeout_minutes: 5,
        reminders: {
          count: 2,
          interval_minutes: 2,
        },
      },
      staging_configuration: {},
      development_configuration: {},
      retry_configuration: {},
      outbound_retry_configuration: {},
      node_component_id: null,
      node_component_input_mapping: [],
      node_output: null,
    };
  }

  private createPromptNode(agentNodeId: string, prompt: GeneratedPrompt): WorkflowNode {
    const promptBlocks = this.markdownToPromptBlocks(prompt.agentPrompt);

    return {
      id: uuidv4(),
      persistent_id: uuidv4(),
      slug: this.generateSlug(),
      org_id: this.options.orgId,
      use_case_id: this.options.useCaseId,
      parent_id: agentNodeId,
      version_id: this.versionId,
      type: 'prompt',
      name: 'Prompt',
      is_complete: false,
      node_output_id: null,
      sort_index: -1,
      timestamp: this.timestamp,
      is_deleted: false,
      configuration: {
        initial_message: {
          type: 'static',
          static: prompt.initialMessage,
        },
      },
      staging_configuration: {},
      development_configuration: {},
      retry_configuration: {},
      outbound_retry_configuration: {},
      node_component_id: null,
      node_component_input_mapping: [],
      node_output: null,
      prompt: promptBlocks,
      prompt_md: prompt.agentPrompt,
    };
  }

  private createStatusTool(promptNodeId: string, form: ProcessedForm): WorkflowNode {
    return {
      id: uuidv4(),
      persistent_id: uuidv4(),
      slug: this.generateSlug(),
      org_id: this.options.orgId,
      use_case_id: this.options.useCaseId,
      parent_id: promptNodeId,
      version_id: this.versionId,
      type: 'tool',
      name: 'consultar_estado_formulario',
      is_complete: true,
      node_output_id: null,
      sort_index: 0,
      timestamp: this.timestamp,
      is_deleted: false,
      configuration: {},
      staging_configuration: {},
      development_configuration: {},
      retry_configuration: {},
      outbound_retry_configuration: {},
      node_component_id: null,
      node_component_input_mapping: [],
      node_output: null,
      function: {
        description: [
          {
            type: 'paragraph',
            children: [
              {
                text: 'Usa esta herramienta cuando quieras revisar internamente qué campos del formulario ya tienes completos y cuáles faltan por rellenar. No necesitas parámetros, simplemente invócala para obtener un resumen del estado actual.',
              },
            ],
          },
        ],
        message: {
          type: 'none',
          description: [
            {
              type: 'paragraph',
              children: [
                {
                  text: 'Revisa internamente el estado y decide qué preguntar a continuación. No muestres el listado técnico al vigilante.',
                },
              ],
            },
          ],
          example: 'Me faltan algunos datos. Déjame preguntarte un par de cosas más.',
        },
        parameters: [],
        tool_index_id: `tool:${uuidv4()}`,
        tool_index_hash: uuidv4().replace(/-/g, ''),
      },
    };
  }

  private createSubmitTool(
    promptNodeId: string,
    form: ProcessedForm,
    prompt: GeneratedPrompt
  ): WorkflowNode {
    // Build parameters from form fields (excluding attachments)
    const parameters: ToolParameter[] = form.allFields
      .filter((f) => f.fieldType !== FieldType.Attachment)
      .map((f) => ({
        name: this.fieldToParamName(f),
        example: this.getFieldExample(f),
        description: [
          {
            type: 'paragraph' as const,
            children: [
              {
                text: `${f.question} (UID: ${f.uid})${f.mandatory ? ' [OBLIGATORIO]' : ''}${f.options.length > 0 ? `. Opciones: ${f.options.map((o) => o.value).join(', ')}` : ''}`,
              },
            ],
          },
        ],
      }));

    return {
      id: uuidv4(),
      persistent_id: uuidv4(),
      slug: this.generateSlug(),
      org_id: this.options.orgId,
      use_case_id: this.options.useCaseId,
      parent_id: promptNodeId,
      version_id: this.versionId,
      type: 'tool',
      name: 'finalizar_formulario',
      is_complete: true,
      node_output_id: null,
      sort_index: 0,
      timestamp: this.timestamp,
      is_deleted: false,
      configuration: {},
      staging_configuration: {},
      development_configuration: {},
      retry_configuration: {},
      outbound_retry_configuration: {},
      node_component_id: null,
      node_component_input_mapping: [],
      node_output: null,
      function: {
        description: [
          {
            type: 'paragraph',
            children: [
              {
                text: 'Usa esta herramienta cuando hayas recopilado toda la información necesaria del vigilante y quieras enviar el formulario completado. Incluye TODOS los campos que hayas podido rellenar, tanto obligatorios como opcionales. Los valores deben coincidir exactamente con las opciones disponibles cuando sean campos de selección.',
              },
            ],
          },
        ],
        message: {
          type: 'ai',
          description: [
            {
              type: 'paragraph',
              children: [
                {
                  text: 'Confirma al vigilante que los datos se han enviado correctamente y que puede revisar el formulario pre-rellenado en la app.',
                },
              ],
            },
          ],
          example:
            'Perfecto, he enviado los datos al formulario. Puedes revisarlo en la app y completar o corregir lo que necesites antes de enviarlo definitivamente.',
        },
        parameters,
        tool_index_id: `tool:${uuidv4()}`,
        tool_index_hash: uuidv4().replace(/-/g, ''),
      },
    };
  }

  private createExtractNode(
    agentNodeId: string,
    form: ProcessedForm,
    prompt: GeneratedPrompt
  ): WorkflowNode {
    const extractionFields = prompt.extractionSchema;
    const fieldDescriptions = extractionFields
      .map((f) => {
        let desc = `- ${f.key}: ${f.question} (${f.type})`;
        if (f.mandatory) desc += ' [OBLIGATORIO]';
        if (f.options) desc += ` Opciones: ${f.options.join(', ')}`;
        return desc;
      })
      .join('\n');

    const extractionPrompt = `Extrae todos los campos del formulario de incidencia de la transcripción de la conversación.

Campos a extraer:
${fieldDescriptions}

Reglas:
- Para campos de selección, usa el texto EXACTO de la opción
- Para campos múltiples, separa valores con " | "
- Para fecha/hora, usa formato ISO 8601 (YYYY-MM-DDTHH:mm:ss)
- Para números, solo el valor numérico como string
- Si un campo no fue mencionado, omítelo (no pongas null ni vacío)
- Incluye deducciones implícitas (ej: "llamamos a la policía" → asistencias = "Sí")`;

    return {
      id: uuidv4(),
      persistent_id: uuidv4(),
      slug: this.generateSlug(),
      org_id: this.options.orgId,
      use_case_id: this.options.useCaseId,
      parent_id: agentNodeId,
      version_id: this.versionId,
      type: 'action',
      name: 'Extraer y Enviar Datos',
      is_complete: false,
      node_output_id: null,
      sort_index: 0,
      timestamp: this.timestamp,
      is_deleted: false,
      configuration: {
        prompt: extractionPrompt,
        input: 'transcript',
        schema: this.buildExtractionSchema(extractionFields),
      },
      staging_configuration: {},
      development_configuration: {},
      retry_configuration: {},
      outbound_retry_configuration: {},
      node_component_id: null,
      node_component_input_mapping: [],
      node_output: null,
    };
  }

  private createSubmitWebhookNode(extractNodeId: string): WorkflowNode {
    return {
      id: uuidv4(),
      persistent_id: uuidv4(),
      slug: this.generateSlug(),
      org_id: this.options.orgId,
      use_case_id: this.options.useCaseId,
      parent_id: extractNodeId,
      version_id: this.versionId,
      type: 'action',
      name: 'Enviar a Backend',
      is_complete: false,
      node_output_id: null,
      sort_index: 0,
      timestamp: this.timestamp,
      is_deleted: false,
      configuration: {
        url: `${this.options.backendUrl}/api/webhooks/happyrobot/complete`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          form_id: this.options.formId,
          incident_family: this.options.incidentFamily,
          incident_type: this.options.incidentType,
          // These would reference extracted data via variables in the real workflow
          extracted_data: '{{extracted_data}}',
          transcript: '{{transcript}}',
        },
      },
      staging_configuration: {},
      development_configuration: {},
      retry_configuration: {},
      outbound_retry_configuration: {},
      node_component_id: null,
      node_component_input_mapping: [],
      node_output: null,
    };
  }

  // -----------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------

  /**
   * Convert markdown text to HappyRobot prompt block format.
   */
  private markdownToPromptBlocks(markdown: string): PromptBlock[] {
    const blocks: PromptBlock[] = [];
    const lines = markdown.split('\n');

    for (const line of lines) {
      if (line.trim() === '') continue;

      let block: PromptBlock;

      if (line.startsWith('# ')) {
        block = this.createBlock('h1', line.slice(2).trim());
      } else if (line.startsWith('## ')) {
        block = this.createBlock('h2', line.slice(3).trim());
      } else if (line.startsWith('### ')) {
        block = this.createBlock('h2', line.slice(4).trim());
      } else if (line.startsWith('---')) {
        block = this.createBlock('hr', '');
      } else if (line.match(/^[\s]*[-*]\s/)) {
        const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
        const text = line.replace(/^[\s]*[-*]\s/, '').trim();
        block = this.createBlock('p', text);
        block.indent = Math.floor(indent / 2) + 1;
        block.listStyleType = 'disc';
      } else if (line.match(/^\d+\.\s/)) {
        const text = line.replace(/^\d+\.\s/, '').trim();
        block = this.createBlock('p', text);
        block.indent = 1;
        block.listStyleType = 'decimal';
      } else {
        block = this.createBlock('p', line.trim());
      }

      blocks.push(block);
    }

    return blocks;
  }

  private createBlock(type: string, text: string): PromptBlock {
    const nodeId = this.generateRandomHex(16);
    return {
      type,
      children: this.parseInlineFormatting(text),
      index_node_id: nodeId,
      index_node_hash: this.generateRandomHex(64),
    };
  }

  /**
   * Parse inline markdown formatting (bold, code, etc).
   */
  private parseInlineFormatting(text: string): PromptChild[] {
    if (!text) return [{ text: '' }];

    const children: PromptChild[] = [];
    const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Text before the match
      if (match.index > lastIndex) {
        children.push({ text: text.slice(lastIndex, match.index) });
      }

      if (match[2]) {
        // Bold text
        children.push({ text: match[2], bold: true });
      } else if (match[3]) {
        // Code text
        children.push({ text: match[3], code: true });
      }

      lastIndex = match.index + match[0].length;
    }

    // Remaining text
    if (lastIndex < text.length) {
      children.push({ text: text.slice(lastIndex) });
    }

    if (children.length === 0) {
      children.push({ text });
    }

    return children;
  }

  /**
   * Build a JSON Schema-like extraction schema from field descriptors.
   */
  private buildExtractionSchema(
    fields: GeneratedPrompt['extractionSchema']
  ): Record<string, unknown> {
    const properties: Record<string, unknown> = {};

    for (const field of fields) {
      const prop: Record<string, unknown> = {
        type: 'string',
        description: field.question,
      };
      if (field.options) {
        prop.enum = field.options;
      }
      properties[field.key] = prop;
    }

    return {
      type: 'object',
      properties,
    };
  }

  /**
   * Convert a ProcessedField to a safe parameter name.
   */
  private fieldToParamName(field: ProcessedField): string {
    return field.question
      .replace(/[¿?¡!:.,;()\/]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/á/g, 'a')
      .replace(/é/g, 'e')
      .replace(/í/g, 'i')
      .replace(/ó/g, 'o')
      .replace(/ú/g, 'u')
      .replace(/ñ/g, 'n')
      .substring(0, 60);
  }

  /**
   * Get an example value for a field.
   */
  private getFieldExample(field: ProcessedField): string {
    switch (field.fieldType) {
      case FieldType.DateTime:
        return '2026-02-25T15:30:00';
      case FieldType.Number:
        return '50';
      case FieldType.Boolean:
        return field.options[0]?.value || 'Sí';
      case FieldType.Dropdown:
        return field.options[0]?.value || 'Opción';
      case FieldType.FreeText:
        return 'Texto de ejemplo';
      default:
        return '';
    }
  }

  private generateSlug(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateRandomHex(length: number): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

/**
 * Convenience function to generate a workflow.
 */
export function generateWorkflow(
  form: ProcessedForm,
  prompt: GeneratedPrompt,
  options: WorkflowGeneratorOptions
): WorkflowExport {
  const generator = new WorkflowGenerator(options);
  return generator.generate(form, prompt);
}
