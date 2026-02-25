// ============================================================
// HappyRobot Platform Types
// Types for webhook payloads, workflow nodes, and API responses
// ============================================================

// -----------------------------------------------------------
// Webhook Payloads (incoming from HappyRobot)
// -----------------------------------------------------------

/** Payload sent by HappyRobot when a conversation completes */
export interface HappyRobotCompletionPayload {
  /** HappyRobot's conversation/session ID */
  session_id: string;
  /** Workflow persistent ID */
  workflow_id: string;
  /** Node that triggered this webhook */
  node_id: string;
  /** Trigger data passed when the workflow started */
  trigger_data: {
    form_id: string;
    guard_id: string;
    center_id: string;
    incident_family: string;
    incident_type: string;
  };
  /** Full conversation transcript */
  transcript: string;
  /** AI Extract results — key/value pairs extracted from conversation */
  extracted_data: Record<string, string | string[] | null>;
  /** Conversation metadata */
  metadata: {
    started_at: string;
    ended_at: string;
    duration_seconds: number;
    message_count: number;
    model_used: string;
  };
}

/** Payload for the prompt generation request (our backend receives this) */
export interface PromptGenerationRequest {
  form_id: string;
  incident_family: string;
  incident_type: string;
}

/** Response from our prompt generation endpoint */
export interface PromptGenerationResponse {
  agent_prompt: string;
  initial_message: string;
  form_schema: FormSchemaForAgent;
}

/** Simplified form schema sent alongside the prompt */
export interface FormSchemaForAgent {
  form_id: string;
  incident_type: string;
  total_fields: number;
  mandatory_fields: number;
  fields: FormFieldDescriptor[];
}

/** Field descriptor for the agent schema */
export interface FormFieldDescriptor {
  uid: string;
  question: string;
  type: string;
  mandatory: boolean;
  multiple: boolean;
  options?: string[];
  fork_description?: string;
}

// -----------------------------------------------------------
// HappyRobot Workflow JSON Types (for generating importable workflows)
// -----------------------------------------------------------

/** Top-level workflow export structure */
export interface HRWorkflowExport {
  version: {
    id: string;
    persistent_id: string;
    organization_id: string;
    name: string;
    description?: string;
    status: string;
    trigger_type: string;
    version: number;
    created_at: string;
    updated_at: string;
    nodes: HRNode[];
    edges: HREdge[];
    workflowVersion: number;
  };
}

/** Edge definition (usually empty in workflow v2, hierarchy via parent_id) */
export interface HREdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

/** A node in the HappyRobot workflow */
export interface HRNode {
  id: string;
  persistent_id: string;
  workflow_version_id: string;
  name: string;
  type: HRNodeType;
  sort_index: number;
  parent_id: string | null;
  configuration: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  /** Rich text prompt blocks (for prompt-type nodes) */
  prompt?: HRPromptBlock[];
  /** Markdown version of the prompt */
  prompt_md?: string;
}

export type HRNodeType = 'action' | 'prompt' | 'tool' | 'condition' | 'loop';

/** Rich text block within a prompt node */
export interface HRPromptBlock {
  id: string;
  type: 'paragraph' | 'heading' | 'bulletList' | 'orderedList' | 'listItem' | 'text' | 'hardBreak';
  content?: HRPromptBlock[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: HRTextMark[];
}

/** Text formatting mark */
export interface HRTextMark {
  type: 'bold' | 'italic' | 'code' | 'link';
  attrs?: Record<string, unknown>;
}

/** Variable reference within rich text */
export interface HRVariableBlock {
  type: 'variable';
  attrs: {
    id: string;
    label: string;
    group_id: string;
    fallback?: string;
  };
}

// -----------------------------------------------------------
// Tool Definition Types (for agent tools in workflow)
// -----------------------------------------------------------

/** Tool configuration for a tool-type node */
export interface HRToolConfig {
  description: string;
  parameters?: HRToolParameter[];
  /** Child action node handles tool execution */
}

/** Parameter for a tool */
export interface HRToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  enum?: string[];
}

// -----------------------------------------------------------
// Chatbot Agent Configuration
// -----------------------------------------------------------

/** Configuration for a chatbot agent node */
export interface HRChatbotAgentConfig {
  channel: 'chatbot';
  agent: {
    languages: HRStaticValue<{ id: string; name: string }>[];
    model: HRStaticValue<{ id: string; name: string }>;
  };
  media_processing?: {
    transcription: {
      enabled: boolean;
      model?: string;
    };
  };
  idle_timeout_minutes?: number;
  reminders?: {
    count: number;
    interval_minutes: number;
  };
}

/** Static value wrapper used in HappyRobot configs */
export interface HRStaticValue<T> {
  type: 'static';
  static: T;
}

// -----------------------------------------------------------
// Webhook Action Configuration
// -----------------------------------------------------------

/** Configuration for a webhook action node */
export interface HRWebhookActionConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  auth_type?: 'api_key' | 'bearer' | 'none';
}
