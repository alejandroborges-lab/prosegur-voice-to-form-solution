// ============================================================
// WorkflowGenerator — Generates HappyRobot-compatible workflow
// JSON files that can be imported into the platform.
//
// Structural format matches outbound-sales-agent-version-3.json
// reference export exactly: every node type has the required
// fields with proper Plate editor block format.
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { ProcessedForm, ProcessedField, FieldType } from '@/types/form';
import { GeneratedPrompt } from './promptGenerator';

// -----------------------------------------------------------
// HappyRobot Platform Constants
// Built-in integration and event IDs (same for all orgs)
// -----------------------------------------------------------

const WEBHOOK_INTEGRATION = {
  id: '01926a93-064a-7a00-81b2-8ab78d5907e0',
  name: 'Webhook',
  group: 'built-in',
  icon: '/integrations/webhook.svg',
  description: 'Connect your agents to external systems via REST APIs',
  docs_url: 'https://docs.happyrobot.ai/integrations/webhook',
  website_url: 'https://docs.happyrobot.ai/integrations/webhook',
  is_top: true,
  requires_credentials: false,
  agent_specific: false,
};

const INCOMING_HOOK_EVENT = {
  id: '01929b66-a335-7514-a159-cae2fe715286',
  name: 'Incoming hook',
  integration_id: WEBHOOK_INTEGRATION.id,
  type: 0,
  description: 'Listen to a new GET, POST or PUT request.',
  is_instant: true,
  has_cron_trigger: false,
  activity_name: '',
  task_queue: '',
  timeout_seconds: 10,
  retry_policy: {
    InitialInterval: 0,
    MaximumAttempts: 2,
    BackoffCoefficient: 2,
  },
  wait_for_signal_seconds: 0,
  key_for_sleep: null,
  coming_soon: false,
};

const AI_AGENT_INTEGRATION = {
  id: '0192e48a-81d8-71cb-93dc-efd8ad63d86b',
  name: 'AI Agent',
  group: 'built-in',
  icon: '/integrations/ai-agent.svg',
  description: 'Create AI-powered conversational agents',
  docs_url: 'https://docs.happyrobot.ai/integrations/ai-agent',
  website_url: 'https://docs.happyrobot.ai/integrations/ai-agent',
  is_top: true,
  requires_credentials: false,
  agent_specific: true,
};

// Outbound Voice Agent event is used as the structural template.
// After importing, change the agent channel to "Chatbot" in the
// HappyRobot UI (Settings → Agent → Channel).
const AGENT_EVENT = {
  id: '0192e5dc-090a-7f57-87a0-76308ed6ef28',
  name: 'Outbound Voice Agent',
  integration_id: AI_AGENT_INTEGRATION.id,
  type: 1,
  description: 'Create outbound call',
  is_instant: false,
  has_cron_trigger: false,
  activity_name: 'OutboundVoiceAgent',
  task_queue: '',
  timeout_seconds: 600,
  retry_policy: {
    InitialInterval: 0,
    MaximumAttempts: 1,
    BackoffCoefficient: 2,
  },
  wait_for_signal_seconds: 0,
  key_for_sleep: null,
  coming_soon: false,
};

const AI_INTEGRATION = {
  id: '01926a90-7f9e-785e-891c-51338a7aa70c',
  name: 'AI',
  group: 'built-in',
  icon: '/integrations/ai.svg',
  description: 'Use AI to process, extract, and classify data',
  docs_url: 'https://docs.happyrobot.ai/integrations/ai',
  website_url: 'https://docs.happyrobot.ai/integrations/ai',
  is_top: true,
  requires_credentials: false,
  agent_specific: false,
};

const AI_EXTRACT_EVENT = {
  id: '01926f30-36a3-7394-8f73-eeead5d7f948',
  name: 'Extract',
  integration_id: AI_INTEGRATION.id,
  type: 1,
  description: 'Extract structured data using AI.',
  is_instant: false,
  has_cron_trigger: false,
  activity_name: 'extract',
  task_queue: '',
  timeout_seconds: 120,
  retry_policy: {
    InitialInterval: 0,
    MaximumAttempts: 2,
    BackoffCoefficient: 2,
  },
  wait_for_signal_seconds: 0,
  key_for_sleep: null,
  coming_soon: false,
};

// -----------------------------------------------------------
// Types — match reference export exactly
// -----------------------------------------------------------

/** Plate block used in the prompt field (uses short types: p, h1, h2, h3, hr) */
interface PromptBlock {
  type: string;
  children: InlineChild[];
  index_node_id: string;
  index_node_hash: string;
  indent?: number;
  listStyleType?: string;
}

/** Plate block used everywhere else (type is always "paragraph") */
interface ParagraphBlock {
  type: 'paragraph';
  children: InlineChild[];
}

/** Inline element within a Plate block */
interface InlineChild {
  text: string;
  bold?: boolean;
  code?: boolean;
  type?: string;
  group_id?: string;
  variable_id?: string;
  children?: InlineChild[];
}

interface ToolFunction {
  description: ParagraphBlock[];
  message: {
    type: 'none' | 'ai';
    description: ParagraphBlock[];
    example: string;
  };
  parameters: ToolParameter[];
  tool_index_id: string;
  tool_index_hash: string;
}

interface ToolParameter {
  name: string;
  example: string;
  description: ParagraphBlock[];
}

interface IntegrationRef {
  id: string;
  name: string;
  group: string;
  icon: string;
  description: string;
  docs_url: string;
  website_url: string;
  is_top: boolean;
  requires_credentials: boolean;
  agent_specific: boolean;
}

interface EventRef {
  id: string;
  name: string;
  integration_id: string;
  type: number;
  description: string;
  is_instant: boolean;
  has_cron_trigger: boolean;
  activity_name: string;
  task_queue: string;
  timeout_seconds: number;
  retry_policy: {
    InitialInterval: number;
    MaximumAttempts: number;
    BackoffCoefficient: number;
  };
  wait_for_signal_seconds: number;
  key_for_sleep: string | null;
  coming_soon: boolean;
}

interface NodeOutput {
  id: string;
  run_id: string | null;
  node_id: string;
  node_persistent_id: string;
  event_id: string;
  session_id: string | null;
  chat_session_id: string | null;
  name: string;
  data: Record<string, unknown>;
  flat_data: Record<string, unknown>;
  is_multiple: boolean;
  error: string | null;
  llm_model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cached_input_tokens: number | null;
  input: unknown | null;
  status: string | null;
  scope: string;
  data_deleted: boolean;
  timestamp: string;
}

// Base fields shared by ALL node types (22 fields)
interface BaseNode {
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
  node_output: NodeOutput | null;
}

// Action node = base + 7 action-specific fields
interface ActionNode extends BaseNode {
  type: 'action';
  integration_id: string;
  event_id: string;
  trigger_interval: unknown | null;
  multi_event_behavior: string;
  hidden_fields: unknown[];
  integration: IntegrationRef;
  event: EventRef;
}

// Prompt node = base + 7 prompt-specific fields
interface PromptNode extends BaseNode {
  type: 'prompt';
  prompt: PromptBlock[];
  prompt_md: string;
  initial_message: ParagraphBlock[];
  model: { type: string; static: { id: string; name: string } };
  inbound_prompt: ParagraphBlock[] | null;
  inbound_prompt_md: string | null;
  receiving_initial_message: ParagraphBlock[] | null;
}

// Tool node = base + 1 tool-specific field
interface ToolNode extends BaseNode {
  type: 'tool';
  function: ToolFunction;
}

type WorkflowNode = ActionNode | PromptNode | ToolNode;

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
  backendUrl: string;
  orgId?: string;
  useCaseId?: string;
  formId: string;
  incidentType: string;
  incidentFamily: string;
}

export class WorkflowGenerator {
  private orgId: string;
  private useCaseId: string;
  private versionId: string;
  private timestamp: string;
  private backendUrl: string;
  private formId: string;
  private incidentType: string;
  private incidentFamily: string;

  constructor(options: WorkflowGeneratorOptions) {
    this.orgId = options.orgId || '00000000-0000-0000-0000-000000000000';
    this.useCaseId = options.useCaseId || uuidv4();
    this.versionId = uuidv4();
    this.timestamp = new Date().toISOString();
    this.backendUrl = options.backendUrl;
    this.formId = options.formId;
    this.incidentType = options.incidentType;
    this.incidentFamily = options.incidentFamily;
  }

  generate(form: ProcessedForm, prompt: GeneratedPrompt): WorkflowExport {
    const nodes: WorkflowNode[] = [];

    // Node 1: Webhook Trigger (action)
    const triggerNode = this.createTriggerNode();
    nodes.push(triggerNode);

    // Node 2: Agent Action (action)
    const agentNode = this.createAgentNode(triggerNode.id);
    nodes.push(agentNode);

    // Node 3: Prompt (prompt, child of agent, sort -1)
    const promptNode = this.createPromptNode(agentNode.id, prompt);
    nodes.push(promptNode);

    // Node 4: Tool "consultar_estado_formulario" (tool, child of prompt)
    const statusTool = this.createStatusTool(promptNode.id);
    nodes.push(statusTool);

    // Node 5: Tool "finalizar_formulario" (tool, child of prompt)
    const submitTool = this.createSubmitTool(promptNode.id, form);
    nodes.push(submitTool);

    // Node 6: AI Extract (action, child of agent, sort 0)
    const extractNode = this.createExtractNode(
      agentNode.id,
      agentNode.persistent_id,
      form,
      prompt
    );
    nodes.push(extractNode);

    return {
      version: {
        id: this.versionId,
        slug: this.generateSlug(),
        org_id: this.orgId,
        use_case_id: this.useCaseId,
        version_number: 1,
        name: 'Version 1',
        is_published: false,
        is_live: false,
        source_version_id: null,
        timestamp: this.timestamp,
        published_at: null,
        is_deleted: false,
        description: `Workflow para formulario de incidencia: ${this.incidentType}`,
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

  private createTriggerNode(): ActionNode {
    const id = uuidv4();
    const persistentId = uuidv4();

    return {
      id,
      persistent_id: persistentId,
      slug: this.generateSlug(),
      org_id: this.orgId,
      use_case_id: this.useCaseId,
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
        enhanced_security: false,
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
        event_id: INCOMING_HOOK_EVENT.id,
        session_id: null,
        chat_session_id: null,
        name: 'Incidencia Trigger',
        data: {
          data: {
            form_id: this.formId,
            guard_id: 'GUARD_001',
            center_id: 'CENTER_001',
            incident_family: this.incidentFamily,
            incident_type: this.incidentType,
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
        llm_model: null,
        input_tokens: null,
        output_tokens: null,
        cached_input_tokens: null,
        input: null,
        status: null,
        scope: '',
        data_deleted: false,
        timestamp: this.timestamp,
      },
      integration_id: WEBHOOK_INTEGRATION.id,
      event_id: INCOMING_HOOK_EVENT.id,
      trigger_interval: null,
      multi_event_behavior: 'parallel',
      hidden_fields: [],
      integration: { ...WEBHOOK_INTEGRATION },
      event: { ...INCOMING_HOOK_EVENT },
    };
  }

  private createAgentNode(triggerNodeId: string): ActionNode {
    const id = uuidv4();
    const persistentId = uuidv4();

    return {
      id,
      persistent_id: persistentId,
      slug: this.generateSlug(),
      org_id: this.orgId,
      use_case_id: this.useCaseId,
      parent_id: triggerNodeId,
      version_id: this.versionId,
      type: 'action',
      name: `Agente Incidencia - ${this.incidentType}`,
      is_complete: false,
      node_output_id: null,
      sort_index: 0,
      timestamp: this.timestamp,
      is_deleted: false,
      configuration: {
        agent: {
          name: [this.makeParagraph(`Asistente Prosegur - ${this.incidentType}`)],
          languages: [
            {
              type: 'static',
              static: { id: 'es', name: 'Spanish' },
            },
          ],
        },
        transcription_context: [this.makeParagraph('')],
        keyterms: [],
      },
      staging_configuration: {},
      development_configuration: {},
      retry_configuration: {},
      outbound_retry_configuration: {},
      node_component_id: null,
      node_component_input_mapping: [],
      node_output: null,
      integration_id: AI_AGENT_INTEGRATION.id,
      event_id: AGENT_EVENT.id,
      trigger_interval: null,
      multi_event_behavior: 'parallel',
      hidden_fields: [],
      integration: { ...AI_AGENT_INTEGRATION },
      event: { ...AGENT_EVENT },
    };
  }

  private createPromptNode(agentNodeId: string, prompt: GeneratedPrompt): PromptNode {
    const promptBlocks = this.markdownToPromptBlocks(prompt.agentPrompt);

    return {
      id: uuidv4(),
      persistent_id: uuidv4(),
      slug: this.generateSlug(),
      org_id: this.orgId,
      use_case_id: this.useCaseId,
      parent_id: agentNodeId,
      version_id: this.versionId,
      type: 'prompt',
      name: 'Prompt',
      is_complete: false,
      node_output_id: null,
      sort_index: -1,
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
      // Prompt-specific fields
      prompt: promptBlocks,
      prompt_md: prompt.agentPrompt,
      initial_message: [this.makeParagraph(prompt.initialMessage)],
      model: {
        type: 'static',
        static: { id: 'claude-sonnet-4-5-20250514', name: 'Claude Sonnet 4.5' },
      },
      inbound_prompt: null,
      inbound_prompt_md: null,
      receiving_initial_message: null,
    };
  }

  private createStatusTool(promptNodeId: string): ToolNode {
    const persistentId = uuidv4();

    return {
      id: uuidv4(),
      persistent_id: persistentId,
      slug: this.generateSlug(),
      org_id: this.orgId,
      use_case_id: this.useCaseId,
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
          this.makeParagraph(
            'Usa esta herramienta cuando quieras revisar internamente qué campos del formulario ya tienes completos y cuáles faltan por rellenar. No necesitas parámetros, simplemente invócala para obtener un resumen del estado actual.'
          ),
        ],
        message: {
          type: 'none',
          description: [
            this.makeParagraph(
              'Revisa internamente el estado y decide qué preguntar a continuación. No muestres el listado técnico al vigilante.'
            ),
          ],
          example:
            'Me faltan algunos datos. Déjame preguntarte un par de cosas más.',
        },
        parameters: [],
        tool_index_id: `tool:${persistentId}`,
        tool_index_hash: this.generateRandomHex(64),
      },
    };
  }

  private createSubmitTool(
    promptNodeId: string,
    form: ProcessedForm
  ): ToolNode {
    const persistentId = uuidv4();

    const parameters: ToolParameter[] = form.allFields
      .filter((f) => f.fieldType !== FieldType.Attachment)
      .map((f) => ({
        name: this.fieldToParamName(f),
        example: this.getFieldExample(f),
        description: [
          this.makeParagraph(
            `${f.question} (UID: ${f.uid})${f.mandatory ? ' [OBLIGATORIO]' : ''}${f.options.length > 0 ? `. Opciones: ${f.options.map((o) => o.value).join(', ')}` : ''}`
          ),
        ],
      }));

    return {
      id: uuidv4(),
      persistent_id: persistentId,
      slug: this.generateSlug(),
      org_id: this.orgId,
      use_case_id: this.useCaseId,
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
          this.makeParagraph(
            'Usa esta herramienta cuando hayas recopilado toda la información necesaria del vigilante y quieras enviar el formulario completado. Incluye TODOS los campos que hayas podido rellenar, tanto obligatorios como opcionales. Los valores deben coincidir exactamente con las opciones disponibles cuando sean campos de selección.'
          ),
        ],
        message: {
          type: 'ai',
          description: [
            this.makeParagraph(
              'Confirma al vigilante que los datos se han enviado correctamente y que puede revisar el formulario pre-rellenado en la app.'
            ),
          ],
          example:
            'Perfecto, he enviado los datos al formulario. Puedes revisarlo en la app y completar o corregir lo que necesites antes de enviarlo definitivamente.',
        },
        parameters,
        tool_index_id: `tool:${persistentId}`,
        tool_index_hash: this.generateRandomHex(64),
      },
    };
  }

  private createExtractNode(
    agentNodeId: string,
    agentPersistentId: string,
    form: ProcessedForm,
    prompt: GeneratedPrompt
  ): ActionNode {
    const id = uuidv4();
    const persistentId = uuidv4();

    const extractionFields = prompt.extractionSchema;

    // Build extraction prompt as Plate paragraph blocks
    const promptLines = [
      'Extrae todos los campos del formulario de incidencia de la transcripción de la conversación.',
      '',
      'Campos a extraer:',
    ];
    for (const f of extractionFields) {
      let desc = `- ${f.key}: ${f.question} (${f.type})`;
      if (f.mandatory) desc += ' [OBLIGATORIO]';
      if (f.options) desc += ` Opciones: ${f.options.join(', ')}`;
      promptLines.push(desc);
    }
    promptLines.push(
      '',
      'Reglas:',
      '- Para campos de selección, usa el texto EXACTO de la opción',
      '- Para campos múltiples, separa valores con " | "',
      '- Para fecha/hora, usa formato ISO 8601 (YYYY-MM-DDTHH:mm:ss)',
      '- Para números, solo el valor numérico como string',
      '- Si un campo no fue mencionado, omítelo (no pongas null ni vacío)',
      '- Incluye deducciones implícitas (ej: "llamamos a la policía" → asistencias = "Sí")'
    );

    const promptBlocks: ParagraphBlock[] = promptLines
      .filter((line) => line !== '')
      .map((line) => this.makeParagraph(line));

    // Build input field referencing the agent transcript
    const inputBlock: ParagraphBlock = {
      type: 'paragraph',
      children: [
        { text: '' },
        {
          type: 'variable',
          text: '',
          children: [{ text: '' }],
          group_id: agentPersistentId,
          variable_id: 'transcript',
        },
        { text: '' },
      ],
    };

    // Build JSON schema as Plate paragraph blocks (one block per line)
    const schemaObj = this.buildExtractionSchema(extractionFields);
    const schemaLines = JSON.stringify(schemaObj, null, 2).split('\n');
    const schemaBlocks: ParagraphBlock[] = schemaLines.map((line) =>
      this.makeParagraph(line)
    );

    return {
      id,
      persistent_id: persistentId,
      slug: this.generateSlug(),
      org_id: this.orgId,
      use_case_id: this.useCaseId,
      parent_id: agentNodeId,
      version_id: this.versionId,
      type: 'action',
      name: 'Extraer Datos de Conversación',
      is_complete: false,
      node_output_id: null,
      sort_index: 0,
      timestamp: this.timestamp,
      is_deleted: false,
      configuration: {
        prompt: promptBlocks,
        input: [inputBlock],
        parameters: [],
        json_schema: schemaBlocks,
        model: {
          type: 'static',
          static: { id: 'claude-sonnet-4-5-20250514', name: 'Claude Sonnet 4.5' },
        },
      },
      staging_configuration: {},
      development_configuration: {},
      retry_configuration: {},
      outbound_retry_configuration: {},
      node_component_id: null,
      node_component_input_mapping: [],
      node_output: null,
      integration_id: AI_INTEGRATION.id,
      event_id: AI_EXTRACT_EVENT.id,
      trigger_interval: null,
      multi_event_behavior: 'parallel',
      hidden_fields: [],
      integration: { ...AI_INTEGRATION },
      event: { ...AI_EXTRACT_EVENT },
    };
  }

  // -----------------------------------------------------------
  // Plate Block Helpers
  // -----------------------------------------------------------

  /**
   * Create a simple "paragraph" block (used in configuration, tools,
   * initial_message — everywhere EXCEPT the prompt field).
   */
  private makeParagraph(text: string): ParagraphBlock {
    return {
      type: 'paragraph',
      children: [{ text }],
    };
  }

  /**
   * Convert markdown to Plate prompt blocks (uses short types:
   * p, h1, h2, h3, hr — with index_node_id and index_node_hash).
   */
  private markdownToPromptBlocks(markdown: string): PromptBlock[] {
    const blocks: PromptBlock[] = [];
    const lines = markdown.split('\n');

    for (const line of lines) {
      if (line.trim() === '') continue;

      let block: PromptBlock;

      if (line.startsWith('# ')) {
        block = this.createPromptBlock('h1', line.slice(2).trim());
      } else if (line.startsWith('## ')) {
        block = this.createPromptBlock('h2', line.slice(3).trim());
      } else if (line.startsWith('### ')) {
        block = this.createPromptBlock('h3', line.slice(4).trim());
      } else if (line.startsWith('---')) {
        block = this.createPromptBlock('hr', '');
      } else if (line.match(/^[\s]*[-*]\s/)) {
        const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
        const text = line.replace(/^[\s]*[-*]\s/, '').trim();
        block = this.createPromptBlock('p', text);
        block.indent = Math.floor(indent / 2) + 1;
        block.listStyleType = 'disc';
      } else if (line.match(/^\d+\.\s/)) {
        const text = line.replace(/^\d+\.\s/, '').trim();
        block = this.createPromptBlock('p', text);
        block.indent = 1;
        block.listStyleType = 'decimal';
      } else {
        block = this.createPromptBlock('p', line.trim());
      }

      blocks.push(block);
    }

    return blocks;
  }

  /**
   * Create a prompt block with index_node_id and index_node_hash.
   * The hash is 64 hex chars; the first 16 chars equal the id.
   */
  private createPromptBlock(type: string, text: string): PromptBlock {
    const nodeId = this.generateRandomHex(16);
    const hashSuffix = this.generateRandomHex(48);
    return {
      type,
      children: this.parseInlineFormatting(text),
      index_node_id: nodeId,
      index_node_hash: nodeId + hashSuffix,
    };
  }

  /**
   * Parse inline markdown formatting (bold, code).
   */
  private parseInlineFormatting(text: string): InlineChild[] {
    if (!text) return [{ text: '' }];

    const children: InlineChild[] = [];
    const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        children.push({ text: text.slice(lastIndex, match.index) });
      }
      if (match[2]) {
        children.push({ text: match[2], bold: true });
      } else if (match[3]) {
        children.push({ text: match[3], code: true });
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      children.push({ text: text.slice(lastIndex) });
    }

    if (children.length === 0) {
      children.push({ text });
    }

    return children;
  }

  // -----------------------------------------------------------
  // Schema & Field Helpers
  // -----------------------------------------------------------

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

  // -----------------------------------------------------------
  // Random Generators
  // -----------------------------------------------------------

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

// -----------------------------------------------------------
// Convenience export
// -----------------------------------------------------------

export function generateWorkflow(
  form: ProcessedForm,
  prompt: GeneratedPrompt,
  options: WorkflowGeneratorOptions
): WorkflowExport {
  const generator = new WorkflowGenerator(options);
  return generator.generate(form, prompt);
}
